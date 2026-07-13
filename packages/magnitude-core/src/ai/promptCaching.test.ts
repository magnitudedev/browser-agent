import { describe, expect, test } from 'bun:test';

import { Agent } from '@/agent';
import { LLMClient, ModelUsage, OpenAIGenericClient } from '@/ai/types';

import { ModelHarness } from './modelHarness';
import { convertToBamlClientOptions, isOpenRouterClaude } from './util';

function openRouterClient(overrides: Partial<OpenAIGenericClient['options']> = {}): OpenAIGenericClient {
    return {
        provider: 'openai-generic',
        options: {
            model: 'anthropic/claude-sonnet-4',
            baseUrl: 'https://openrouter.ai/api/v1',
            ...overrides,
        },
    };
}

function memoryPromptCaching(agent: Agent): boolean {
    return (agent as unknown as { memoryOptions: { promptCaching: boolean } }).memoryOptions.promptCaching;
}

function setCollector(
    harness: ModelHarness,
    responseBody: unknown,
    collectorUsage: { inputTokens: number; outputTokens: number },
): { _reportUsage(): void } {
    const internals = harness as unknown as {
        collector: {
            usage: { inputTokens: number; outputTokens: number };
            last: {
                calls: Array<{
                    httpResponse: { body: { json: () => unknown } };
                }>;
            };
        };
        _reportUsage(): void;
    };
    internals.collector = {
        usage: collectorUsage,
        last: {
            calls: [
                {
                    httpResponse: { body: { json: () => responseBody } },
                },
            ],
        },
    };
    return internals;
}

function reportUsage(
    llm: LLMClient,
    responseBody: unknown,
    collectorUsage: { inputTokens: number; outputTokens: number },
): ModelUsage {
    const harness = new ModelHarness({ llm });
    let reported: ModelUsage | undefined;
    harness.events.once('tokensUsed', (usage) => {
        reported = usage;
    });

    const internals = setCollector(harness, responseBody, collectorUsage);
    internals._reportUsage();

    expect(reported).toBeDefined();
    return reported as ModelUsage;
}

describe('OpenRouter Claude prompt caching', () => {
    test('recognizes only the official HTTPS API endpoint', async () => {
        expect(isOpenRouterClaude(openRouterClient())).toBe(true);
        expect(isOpenRouterClaude(openRouterClient({ baseUrl: 'https://openrouter.ai/api/v1/' }))).toBe(true);

        for (const baseUrl of [
            'http://openrouter.ai/api/v1',
            'https://openrouter.ai.evil.example/api/v1',
            'https://openrouter.ai/api/v1/extra',
            'https://user@openrouter.ai/api/v1',
            'https://openrouter.ai/api/v1?proxy=true',
            'not a URL',
        ]) {
            expect(isOpenRouterClaude(openRouterClient({ baseUrl }))).toBe(false);
        }

        expect(isOpenRouterClaude(openRouterClient({ model: 'openai/gpt-4.1' }))).toBe(false);
    });

    test('forwards cache-control metadata by default and preserves client options', async () => {
        const options = await convertToBamlClientOptions(
            openRouterClient({
                apiKey: 'fixture-key',
                temperature: 0.3,
                headers: { 'X-Test': 'preserved' },
            }),
        );

        expect(options).toMatchObject({
            base_url: 'https://openrouter.ai/api/v1',
            api_key: 'fixture-key',
            model: 'anthropic/claude-sonnet-4',
            temperature: 0.3,
            allowed_role_metadata: ['cache_control'],
            headers: {
                'HTTP-Referer': 'https://magnitude.run',
                'X-Title': 'Magnitude',
                'X-Test': 'preserved',
            },
        });
    });

    test('supports an explicit prompt-caching opt-out', async () => {
        const client = openRouterClient({ promptCaching: false });
        const options = await convertToBamlClientOptions(client);
        const agent = new Agent({ llm: client, actions: [], telemetry: false });

        expect(options).not.toHaveProperty('allowed_role_metadata');
        expect(memoryPromptCaching(agent)).toBe(false);
        expect(client.options.promptCaching).toBe(false);
    });

    test('enables cache-aware memory by default', async () => {
        const client = openRouterClient();
        const agent = new Agent({ llm: client, actions: [], telemetry: false });

        expect(memoryPromptCaching(agent)).toBe(true);
        expect(client.options.promptCaching).toBe(true);
    });

    test('keeps shared memory caching enabled when any model uses it', async () => {
        const enabled: LLMClient = {
            provider: 'anthropic',
            options: { model: 'claude-sonnet-4', promptCaching: true },
            roles: ['act'],
        };
        const disabled: LLMClient = {
            ...openRouterClient({ promptCaching: false }),
            roles: ['extract', 'query'],
        };

        for (const llms of [[enabled, disabled], [disabled, enabled]]) {
            const agent = new Agent({ llm: llms, actions: [], telemetry: false });
            expect(memoryPromptCaching(agent)).toBe(true);
        }
    });
});

describe('OpenRouter usage accounting', () => {
    test('separates uncached, cache-read, and cache-write input tokens', async () => {
        const usage = reportUsage(
            openRouterClient(),
            {
                usage: {
                    prompt_tokens: 1_000,
                    completion_tokens: 50,
                    prompt_tokens_details: {
                        cached_tokens: 600,
                        cache_write_tokens: 300,
                    },
                },
            },
            { inputTokens: 1_000, outputTokens: 50 },
        );

        expect(usage).toMatchObject({
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 600,
            cacheWriteInputTokens: 300,
        });
    });

    test('clamps malformed cache components to the prompt total', async () => {
        const usage = reportUsage(
            openRouterClient(),
            {
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 10,
                    prompt_tokens_details: {
                        cached_tokens: 1_000,
                        cache_write_tokens: 1_000,
                    },
                },
            },
            { inputTokens: 100, outputTokens: 10 },
        );

        expect(usage).toMatchObject({
            inputTokens: 0,
            outputTokens: 10,
            cacheReadInputTokens: 100,
        });
        expect(usage).not.toHaveProperty('cacheWriteInputTokens');
    });

    test('falls back to collector totals when prompt details are unavailable', async () => {
        const usage = reportUsage(
            openRouterClient(),
            { usage: { completion_tokens: 23 } },
            { inputTokens: 400, outputTokens: 23 },
        );

        expect(usage).toMatchObject({ inputTokens: 400, outputTokens: 23 });
        expect(usage).not.toHaveProperty('cacheReadInputTokens');
        expect(usage).not.toHaveProperty('cacheWriteInputTokens');
    });

    test('keeps collector fallback deltas aligned after a cached response', async () => {
        const harness = new ModelHarness({ llm: openRouterClient() });
        const reported: ModelUsage[] = [];
        harness.events.on('tokensUsed', (usage) => reported.push(usage));

        setCollector(
            harness,
            {
                usage: {
                    prompt_tokens: 1_000,
                    completion_tokens: 50,
                    prompt_tokens_details: { cached_tokens: 600 },
                },
            },
            { inputTokens: 1_000, outputTokens: 50 },
        )._reportUsage();
        setCollector(harness, {}, { inputTokens: 1_200, outputTokens: 60 })._reportUsage();

        expect(reported[1]).toMatchObject({ inputTokens: 200, outputTokens: 10 });
    });

    test('preserves native Anthropic input-token semantics', async () => {
        const usage = reportUsage(
            {
                provider: 'anthropic',
                options: { model: 'claude-sonnet-4' },
            },
            {
                usage: {
                    input_tokens: 100,
                    output_tokens: 50,
                    cache_creation_input_tokens: 300,
                    cache_read_input_tokens: 600,
                },
            },
            { inputTokens: 1_000, outputTokens: 50 },
        );

        expect(usage).toMatchObject({
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 600,
            cacheWriteInputTokens: 300,
        });
    });
});
