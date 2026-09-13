# Clean Up Puppeteer Between Cloud Run Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Puppeteer, Performance, Troubleshooting

Description: Diagnose lingering Chromium processes on Cloud Run and choose explicit browser ownership, awaited cleanup, and safe concurrency.

---

A PDF service finishes a request, but Chromium processes remain. Later requests consume more memory, and work sometimes appears to resume only when new traffic arrives. Before changing Cloud Run billing, determine whether the browser is intentionally cached, accidentally leaked, or still processing a request you already acknowledged.

A completed HTTP response does not close a Puppeteer browser. The application owns that resource.

## Separate a live process from active CPU

A process can exist while doing little useful work. Under request-based billing, Cloud Run CPU availability follows request processing; instance-based billing provides CPU across the instance lifecycle. Switching billing modes can allow cleanup or timers to progress outside requests, but it does not correct missing cleanup. [Cloud Run CPU allocation](https://docs.cloud.google.com/run/docs/configuring/billing-settings#cpu-allocation-impact).

Log browser launch, context creation, context closure, browser closure, request completion, and failures. Include a process identifier and revision. Compare these counts over repeated requests.

If one browser stays open and the number of contexts returns to baseline, it may be an intentional reuse design. If a new browser is launched for each request and none is closed, it is a leak. CPU charts alone cannot tell these cases apart.

## Define ownership before writing cleanup

Choose one of two models:

| Model | Owner | End-of-request cleanup |
| --- | --- | --- |
| Browser per request | The request handler | Close the whole browser |
| Browser shared within one instance | An instance-level manager | Close that request's browser context |

The first is simpler and isolates failures, but launching repeatedly can add latency. The second can reduce launch overhead but needs concurrency limits, failure recovery, and shutdown handling. Neither model shares one browser across Cloud Run instances.

Puppeteer's `browser.close()` closes the browser and its pages. `browser.disconnect()` detaches Puppeteer while leaving the browser running. Using disconnect as cleanup is a direct explanation for lingering processes. [Browser.close](https://pptr.dev/api/puppeteer.browser.close), [Browser.disconnect](https://pptr.dev/api/puppeteer.browser.disconnect).

## Await cleanup before responding

This illustrative function creates a PDF from a trusted server-owned template. The caller must await it before ending the response:

```javascript
import puppeteer from 'puppeteer';

export async function renderPdf(trustedHtml) {
  let browser;
  try {
    browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.setContent(trustedHtml, {
      waitUntil: 'load',
      timeout: 15000
    });
    return await page.pdf({
      format: 'A4',
      timeout: 15000
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
```

A return inside `try` still executes the awaited `finally` block before the async function resolves. Closing after `res.end()` instead introduces an avoidable dependency on post-response execution.

The code assumes the container already contains the browser and required libraries. It is not a complete Cloud Run deployment or a browser sandbox configuration. It also does not accept arbitrary URLs; unrestricted navigation would introduce separate access-control and network concerns.

A browser crash or failed close can reject this function. Log cleanup failures and decide whether the instance can safely continue. Do not silently declare success while the resource manager is in an unknown state.

## Reuse a browser through isolated contexts

For a managed shared browser, create a fresh non-default context for each operation:

```javascript
export async function renderWithSharedBrowser(browser, trustedHtml) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setContent(trustedHtml, {
      waitUntil: 'load',
      timeout: 15000
    });
    return await page.pdf({format: 'A4', timeout: 15000});
  } finally {
    await context.close();
  }
}
```

Closing a browser context closes its associated pages. The default context cannot be closed through this method, which is why the function creates a new context. [BrowserContext.close](https://pptr.dev/api/puppeteer.browsercontext.close).

The surrounding manager must serialize browser creation, limit simultaneous contexts, recover from disconnects, and stop accepting new work during shutdown. Do not let one request call `browser.close()` on a browser that another request still owns.

Separate contexts prevent accidental cookie and storage sharing through the default context, but they do not constitute a complete security boundary for hostile content. Match browser isolation to your application's trust model.

## Size concurrency from browser memory

One HTTP request may create several Chromium processes and significant temporary data. The memory measured by Node.js heap statistics alone is incomplete. Track the container's memory and browser process behavior.

Start with a bounded number of render operations per instance. Align application admission with Cloud Run concurrency; a large platform concurrency setting does not mean the browser can execute that many renders safely. Reject or queue excess work deliberately instead of allowing an unbounded in-process waiting list.

The default writable filesystem also uses instance memory, so temporary screenshots, profiles, and PDFs can contribute unless they are written to a separately configured storage volume. [Cloud Run memory sizing](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits).

For slow exports, use a durable task flow with persisted inputs and outputs. Returning acceptance while leaving a Puppeteer operation in memory can lose the job when the instance is replaced.

## Test the failure paths

Run a staging sequence containing successful renders, malformed templates, slow resources, navigation or rendering timeouts, client cancellation, and a browser crash. For each path, verify that contexts return to baseline and the process count does not rise without bound.

Test simultaneous requests if reusing a browser. One cleanup must not close another request's pages. Also test an idle interval between requests, because constant traffic can hide cleanup that incorrectly depends on future CPU allocation.

These examples are API-checked patterns, not claims of a deployed load test. Record measured launch latency and memory for your actual browser build and document complexity.

## Conclusion

Lingering Chromium processes are resolved through explicit ownership and awaited cleanup. Choose browser-per-request or managed reuse, limit concurrent renders, and handle failed cleanup as a real error. Billing settings determine when code can execute; they do not decide when your application should release a browser.

## Official Documentation

- [Puppeteer Browser.close](https://pptr.dev/api/puppeteer.browser.close)
- [Puppeteer Browser.disconnect](https://pptr.dev/api/puppeteer.browser.disconnect)
- [Puppeteer BrowserContext.close](https://pptr.dev/api/puppeteer.browsercontext.close)
- [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Cloud Run memory limits](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits)
