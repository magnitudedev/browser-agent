import { describe, expect, test } from "bun:test";
import { Browser, chromium } from "playwright";

import { BrowserConnector } from "@/connectors/browserConnector";
import { WebHarness } from "@/web/harness";

function createIsolatedHarness(
  waitForStability: (timeout?: number) => Promise<void>,
): WebHarness {
  const harness = Object.create(WebHarness.prototype) as WebHarness;
  (harness as any).activeActionBatch = null;
  (harness as any).context = {
    pages: () => [],
    on: () => undefined,
    off: () => undefined,
  };
  (harness as any).stability = { waitForStability };
  return harness;
}

describe("WebHarness action batches", () => {
  test("defers repeated waits and preserves pending timeout requirements", async () => {
    const waits: Array<number | undefined> = [];
    const harness = createIsolatedHarness(async (timeout) => {
      waits.push(timeout);
    });

    await harness.waitForStability(25);
    expect(waits).toEqual([25]);
    waits.length = 0;

    await harness.runActionBatch(async () => {
      await harness.waitForStability();
      await harness.waitForStability(25);
      await harness.waitForStability(6000);
    });
    expect(waits).toEqual([6000]);
    waits.length = 0;

    await harness.runActionBatch(async () => {
      await harness.waitForStability(6000);
      await (harness as any).waitForImmediateStability();
    });
    expect(waits).toEqual([6000]);
  });

  test("supports nested batches and coalesces their waits", async () => {
    const waits: Array<number | undefined> = [];
    const harness = createIsolatedHarness(async (timeout) => {
      waits.push(timeout);
    });

    await harness.runActionBatch(async () => {
      await harness.waitForStability(40);
      await harness.runActionBatch(async () => {
        await harness.waitForStability(7000);
      });
      await harness.waitForStability(6000);
    });

    expect(waits).toEqual([7000]);
  });

  test("ignores non-navigation and service worker requests", async () => {
    const waits: Array<number | undefined> = [];
    let requestHandler: ((request: any) => void) | undefined;
    const harness = createIsolatedHarness(async (timeout) => {
      waits.push(timeout);
    });
    (harness as any).context = {
      pages: () => [],
      on: (event: string, handler: (request: any) => void) => {
        if (event === "request") requestHandler = handler;
      },
      off: () => undefined,
    };

    await harness.runActionBatch(async () => {
      expect(requestHandler).toBeDefined();
      const frame = () => {
        throw new Error("frame() must not be called");
      };
      requestHandler!({
        isNavigationRequest: () => false,
        serviceWorker: () => null,
        frame,
      });
      requestHandler!({
        isNavigationRequest: () => true,
        serviceWorker: () => ({}),
        frame,
      });
      await harness.waitForStability();
    });

    expect(waits).toEqual([5000]);
  });

  test("keeps immediate barriers for navigation, tab switches, and click navigation", async () => {
    const browser: Browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const connector = new BrowserConnector({ browser: { context } });

    try {
      await connector.onStart();
      const harness = connector.getHarness();
      const waits: Array<number | undefined> = [];
      (harness as any).stability.waitForStability = async (
        timeout?: number,
      ): Promise<void> => {
        waits.push(timeout);
      };

      await harness.runActionBatch(async () => {
        await harness.waitForStability();
        await harness.navigate("data:text/html,<input autofocus>");
        await harness.waitForStability(75);
        await harness.switchTab({ index: 0 });
      });
      expect(waits).toEqual([5000, 5000]);

      const page = encodeURIComponent(
        `<button id="next" onclick="setTimeout(() => location.href = 'about:blank?next', 50)">next</button>`,
      );
      await harness.navigate(`data:text/html,${page}`);
      waits.length = 0;
      const target = await harness.page.locator("#next").boundingBox();
      if (!target) throw new Error("Navigation target is not visible");

      await harness.runActionBatch(async () => {
        await harness.click(
          { x: target.x + target.width / 2, y: target.y + target.height / 2 },
          { transform: false },
        );
        expect(harness.page.url()).toContain("about:blank?next");
        await harness.waitForStability(75);
      });
      expect(waits).toEqual([undefined, 75]);
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    } finally {
      await connector.onStop();
      await browser.close();
    }
  });
});
