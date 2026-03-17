import { describe, expect, test } from 'bun:test';

describe('z re-export', () => {
    test('z.object() returns a valid schema via entry point', async () => {
        const { z } = await import('@/index');
        const schema = z.object({ name: z.string() });
        const result = schema.safeParse({ name: 'test' });
        expect(result.success).toBe(true);
    });

    test('re-exported z is the same zod instance', async () => {
        const { z: reexported } = await import('@/index');
        const { z: direct } = await import('zod');
        expect(reexported).toBe(direct);
    });
});
