# Capture Sentry Console Errors and Non-Thrown Failures Without Duplicates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Logging, Error Handling, Error Tracking

Description: Choose a single Sentry reporting boundary for console errors, handled exceptions, and failed results while preserving useful context without duplicate events.

`console.error` writes to a console. It does not inherently throw an exception. A function returning `{ ok: false }` also does not create an exception for Sentry's global error handlers to capture. To report these failures, either capture them explicitly or enable an integration that owns the console reporting path.

The difficulty is ownership. If a handler logs a string, captures an exception, and rethrows a new error, one operation can produce multiple events with different messages and stacks. Define which layer reports each failure before enabling more capture mechanisms.

## Distinguish breadcrumbs, errors, and logs

The browser SDK's Breadcrumbs integration can record console calls as context attached to a later event. A console breadcrumb is not itself a standalone error event. See the [Breadcrumbs integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/breadcrumbs/).

`captureConsoleIntegration` creates Sentry events from selected console methods, using message or exception capture while preserving normal console behavior. Its default level list includes much more than `error`, so restrict it deliberately. Sentry documents the integration and `levels` option in [CaptureConsole](https://docs.sentry.io/platforms/javascript/configuration/integrations/captureconsole/).

Sentry's structured Logs product is another channel with its own configuration. Enabling log collection is not equivalent to making each log line an error issue. Decide which signal your application needs rather than enabling every console-related integration together.

## Prefer an explicit boundary for application-owned failures

When you control the code, a reporting function makes the policy visible:

```javascript
import * as Sentry from "@sentry/browser";

const reported = new WeakSet();

export function reportHandledFailure(error, operation) {
  const exception = error instanceof Error
    ? error
    : new Error("Operation failed with a non-Error value");

  if (reported.has(exception)) return;
  reported.add(exception);

  Sentry.withScope(scope => {
    scope.setTag("operation", operation);
    scope.setTag("reporting_owner", "handled-boundary");
    Sentry.captureException(exception);
  });
}
```

Keep `operation` to a bounded set of application-defined names. The helper preserves real `Error` objects and avoids serializing arbitrary failed values, which might include credentials or response bodies. If a non-error result needs diagnostics, extract a small, reviewed set of fields separately.

The `WeakSet` prevents repeated calls to this helper with the same error object. It is not a global deduplication system: another error object, another process, or an independent automatic capture is outside its scope. The main protection remains assigning one owner.

At a handled UI boundary, report once and return a fallback. At a lower layer that rethrows to an error boundary, let the boundary report. Keep CaptureConsole disabled for this strategy; console output can remain breadcrumbs without creating a second error event.

## Report failed results explicitly

Some failures are returned rather than thrown. A successful `fetch` promise can also carry a non-success HTTP status. Check the response and report according to the operation's semantics, as described in [MDN's Fetch guide](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch):

```javascript
export async function loadInvoice(invoiceId) {
  try {
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { ok: false, reason: "not-found" };
      }
      reportHandledFailure(
        new Error(`Invoice request failed with HTTP ${response.status}`),
        "load-invoice",
      );
      return { ok: false, reason: "request-failed" };
    }
    return { ok: true, invoice: await response.json() };
  } catch (error) {
    reportHandledFailure(error, "load-invoice");
    return { ok: false, reason: "request-failed" };
  }
}
```

The example treats `404` as an expected result for this particular lookup. That is a product decision, not a universal rule for HTTP errors. Other operations may need to report it. Do not attach the raw response body or full URL merely to make the event more descriptive.

This boundary catches network failures and response parsing errors too. Because it returns a fallback after capture, an outer handler should not report the same failed result again. If the caller needs to distinguish failure categories, return a typed application result with a stable reason.

## Use console capture when the console is the intended boundary

For legacy code that reports meaningful failures only through `console.error`, enabling the integration may be a practical transition:

```javascript
Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ["error"] }),
  ],
});
```

With this policy, a handled failure should take one route: `console.error(error)`. Do not also call the explicit helper for that path. Passing the original `Error` gives the integration more useful exception information than converting it to a string. In SDK 10.74.0, the [CaptureConsole source](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/captureconsole.ts) checks console arguments for an `Error`, otherwise constructs a message, and marks the event's logger as `console`.

Audit dependencies before rollout. Some libraries use `console.error` for handled warnings or expected validation failures. Restricting the level prevents ordinary `console.log` calls from becoming error events, but it does not prove every remaining call is actionable. Never log secrets merely because the console was previously local.

## Do not depend on accidental deduplication

Sentry includes duplicate protections, but they do not promise one event per business operation. Its [Dedupe integration implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/dedupe.ts) compares consecutive error events using fields such as message or exception, fingerprint, and stack. A logged string and a thrown exception may differ on those fields. Intervening events can also change the comparison.

Likewise, grouping duplicate reports into one issue does not mean only one occurrence was sent. Watch event counts when verifying the reporting policy.

Test an uncaught application exception, a caught and explicitly reported exception, a failed result, a console-only failure, and an ordinary console message. Use fresh failures and inspect the transport or receiving project for each case. Run console tests from application code, not just DevTools input.

Finally, keep capture hooks free of captured console calls. A `beforeSend` callback that uses `console.error` while CaptureConsole is active can generate another event while processing the first. Use a debugger or an independent diagnostic sink for that path. One clear reporting boundary is easier to reason about than a chain of filters trying to remove duplicates afterward.

## References

- [Sentry CaptureConsole integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/captureconsole/)
- [Sentry Breadcrumbs integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/breadcrumbs/)
- [Sentry JavaScript troubleshooting](https://docs.sentry.io/platforms/javascript/troubleshooting/)
- [Sentry 10.74.0 console capture implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/captureconsole.ts)
- [Sentry 10.74.0 duplicate filter implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/dedupe.ts)
