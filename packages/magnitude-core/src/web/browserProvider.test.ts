import { describe, expect, test, beforeEach } from 'bun:test';
import { BrowserProvider } from '@/web/browserProvider';

beforeEach(async () => {
    // Ensure clean state before each test
    await BrowserProvider.reset();
});

describe('BrowserProvider.reset()', () => {
    test('is idempotent when no instance exists', async () => {
        expect((globalThis as any).__magnitude__?.browserProvider).toBeUndefined();
        // Should not throw
        await BrowserProvider.reset();
        expect((globalThis as any).__magnitude__?.browserProvider).toBeUndefined();
    });

    test('is idempotent when instance exists but has no browsers', async () => {
        // Force creation of singleton with no active browsers
        BrowserProvider.getInstance();
        expect((globalThis as any).__magnitude__.browserProvider).toBeDefined();

        await BrowserProvider.reset();
        expect((globalThis as any).__magnitude__.browserProvider).toBeUndefined();
    });

    test('closes active browsers and clears singleton', async () => {
        const instance = BrowserProvider.getInstance();

        // Create a context which launches a real browser
        const context = await instance.newContext({ launchOptions: { headless: true } });

        // Verify a browser is tracked
        expect(Object.keys((instance as any).activeBrowsers).length).toBeGreaterThan(0);

        await BrowserProvider.reset();

        // Singleton should be cleared
        expect((globalThis as any).__magnitude__.browserProvider).toBeUndefined();

        // activeBrowsers on the old instance should be empty
        expect(Object.keys((instance as any).activeBrowsers).length).toBe(0);
    });

    test('does not throw if browser is already closed', async () => {
        const instance = BrowserProvider.getInstance();
        const context = await instance.newContext({ launchOptions: { headless: true } });

        // Close the browser before reset
        const activeBrowser = Object.values((instance as any).activeBrowsers)[0] as any;
        const browser = await activeBrowser.browserPromise;
        await browser.close();

        // reset() should still succeed
        await BrowserProvider.reset();
        expect((globalThis as any).__magnitude__.browserProvider).toBeUndefined();
    });
});
