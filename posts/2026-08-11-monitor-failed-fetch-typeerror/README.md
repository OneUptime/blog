# How to Monitor Failed Fetch Calls When the Browser Exposes Only `TypeError: Failed to fetch`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fetch API, Browser Monitoring, JavaScript Errors, CORS, Network Monitoring, Real User Monitoring

Description: Instrument Fetch failures with safe request context, abort evidence, server correlation, and honest classifications when browser security intentionally hides the root cause.

---

When `fetch()` fails before JavaScript receives an HTTP response, browsers intentionally reveal very little. Chrome commonly reports `TypeError: Failed to fetch`; other engines use different messages. The same surface error can represent DNS failure, refused connection, TLS failure, CORS rejection, Content Security Policy, mixed-content blocking, an extension, or another Fetch-level network error.

That ambiguity is part of the web security model. If scripts could distinguish every cross-origin failure, they could probe networks and resources that are supposed to be opaque. Browser monitoring cannot reliably recover a hidden HTTP status or universal root cause from the exception alone.

It can still make the failure operationally useful. The goal is to classify what is provable, retain safe context, and correlate the remaining unknowns with server, policy, deployment, and synthetic evidence.

## First Separate HTTP Errors from Fetch Rejections

`fetch()` resolves its promise once the response status and headers are available—even when the status is `404`, `429`, or `503`. It rejects when request construction is invalid, when Fetch produces a network error instead of an exposed response, or when the operation is aborted before the promise fulfills. If the signal is aborted after fulfillment, a later read of an unread response body can reject instead.

```js
const response = await fetch("/api/orders");
if (!response.ok) {
  // This is an HTTP failure with a visible status, not "Failed to fetch".
  throw new HttpError(response.status);
}
```

Monitoring needs distinct outcome categories:

| Outcome | Promise behavior | Evidence available |
| --- | --- | --- |
| HTTP `4xx`/`5xx` | Resolves | Status, selected exposed headers, timing |
| Local abort before `fetch()` fulfills | Rejects | `signal.aborted`, abort reason/name, caller context |
| Invalid request/options | Rejects, usually `TypeError` | Request construction error and local code context |
| Fetch network error | Rejects, usually `TypeError` | No script-visible response status |
| Successful opaque `no-cors` response | Resolves with `type: "opaque"` | Status appears as `0`; body and headers are unreadable |

Do not convert every non-OK response and every rejected promise into the same error event. An API returning `503` is much easier to diagnose than a Fetch network error and deserves its own status-based metrics.

## Wrap Requests at a Controlled Boundary

Instrument your API client or request helper instead of depending on `window.onerror`. A wrapper knows the logical operation, method, normalized destination, timeout, and abort signal.

```js
async function monitoredFetch(input, init = {}, context = {}) {
  const startedAt = performance.now();
  let request;

  try {
    request = new Request(input, init);
  } catch (error) {
    reportRequestSafely({
      operation: context.operation ?? "unknown",
      outcome: "invalid_request",
      errorName: safeErrorName(error),
      duration: performance.now() - startedAt,
    });
    throw error;
  }

  const safe = safeRequestContext(request, context);

  try {
    const response = await fetch(request);
    const opaque = response.type === "opaque" || response.type === "opaqueredirect";
    reportRequestSafely({
      ...safe,
      outcome: opaque ? "opaque_response" : response.ok ? "success" : "http_error",
      status: response.status,
      responseType: response.type,
      duration: performance.now() - startedAt,
    });
    return response;
  } catch (error) {
    reportRequestSafely({
      ...safe,
      outcome: classifyRejectedFetch(error, request.signal),
      errorName: safeErrorName(error),
      duration: performance.now() - startedAt,
      onlineHint: navigator.onLine,
      visibility: document.visibilityState,
    });
    throw error;
  }
}

function classifyRejectedFetch(error, signal) {
  if (signal.aborted) {
    if (error?.name === "TimeoutError") return "timeout";
    return "aborted";
  }
  if (error?.name === "TypeError") return "network_error_unclassified";
  return "request_error_other";
}

function reportRequestSafely(event) {
  try {
    Promise.resolve(reportRequest(event)).catch(() => {
      // Track reporter failures through an independent health channel.
    });
  } catch {
    // Monitoring must not change the request's behavior.
  }
}
```

Always rethrow or preserve the application's intended error handling. Monitoring must not turn a failed request into an apparent success, and a reporting failure must not replace the request's original result.

Avoid a global `window.fetch` monkey patch unless you own and test all consumers. Libraries may capture the original function before your patch, and changing call semantics can cause subtle failures. Explicit API-client instrumentation is easier to version and validate. If you use an established RUM or OpenTelemetry Fetch instrumentation, confirm its initialization order and exclude the telemetry exporter itself to prevent recursion.

## Record Context That Is Safe and Actionable

Useful fields include:

- stable operation such as `orders.list`;
- normalized route template and destination origin class (`same-origin`, allowlisted API, third-party);
- HTTP method;
- release and deployment environment;
- request start and elapsed time;
- browser family/version bucket and coarse device/network segment;
- current visibility state;
- service-worker controller present or absent;
- caller-created timeout versus user/navigation cancellation;
- a generated correlation ID for same-origin services you control.

Do not export request or response bodies, authorization headers, cookies, full query strings, signed URLs, user IDs, or arbitrary error objects. Do not use raw URLs as metric labels. Map `/api/orders/9172?token=...` to an allowlisted template such as `/api/orders/:orderId`.

If you add a correlation header to a cross-origin request, remember that a non-safelisted header can cause a CORS preflight and change the request you are measuring. Configure the server's CORS policy deliberately, or correlate through server-generated identifiers exposed in allowed response headers when a response exists.

## Treat Abort as a First-Class Outcome

Applications abort Fetch requests routinely: a user changes routes, a typeahead starts a newer query, or a timeout expires. Those are not necessarily availability failures.

```js
const timeoutSignal = AbortSignal.timeout(8_000);

try {
  await monitoredFetch("/api/search", { signal: timeoutSignal }, {
    operation: "search",
    abortPolicy: "8s-timeout",
  });
} catch (error) {
  if (timeoutSignal.aborted) {
    // UI-specific timeout handling
  }
}
```

When an abort causes the pending `fetch()` promise to reject, the platform may reject with `AbortError`, `TimeoutError`, or a caller-supplied abort reason depending on how the signal was aborted. The most reliable local fact is `signal.aborted`; retain the caller's policy in controlled context rather than parsing a vendor-specific message. Classify navigation supersession, user cancellation, and timeout separately because their service impact differs.

`monitoredFetch()` observes only the `fetch()` promise. If the signal is aborted after response headers make that promise fulfill, a later response-body read can reject; instrument body consumption separately if it is part of the operation.

## What `navigator.onLine` Can—and Cannot—Tell You

`navigator.onLine` is a hint based on browser and operating-system heuristics. A device can report online while captive portal, DNS, routing, VPN, or the destination is failing. It can report a network connection even when the internet is unreachable.

Use it only to refine an unclassified network error:

```text
network_error_unclassified + onlineHint=false
```

Do not rename that event `offline` as a fact, and do not suppress it. Compare with `online`/`offline` events and repeated failures across different destinations, but keep the underlying classification honest.

## Why JavaScript Cannot Diagnose CORS Directly

For a cross-origin Fetch request made in the default `cors` mode, the server must satisfy CORS. A failed preflight or missing/invalid `Access-Control-Allow-Origin` causes the browser to return a network error to the caller. The browser console provides a developer-facing CORS reason, but production page JavaScript does not receive that diagnostic.

Diagnose likely CORS failures with evidence outside the exception:

1. Check server/edge logs for the `OPTIONS` preflight and actual request.
2. Confirm the exact page origin, request method, credentials mode, and request headers.
3. Reproduce in a real browser and inspect the Network and Console panels.
4. Test the deployed response, including error responses, for correct CORS headers.
5. Compare failure onset with API gateway, CDN, and CSP changes.

Do not "fix" observability by setting `mode: "no-cors"`. On a successful cross-origin request, that returns an opaque response whose status, headers, and body are unreadable, so an API caller cannot verify success.

## Use Resource and Server Timing as Supporting Evidence

Resource Timing can provide fetch timing entries, but it is not a guaranteed root-cause oracle. Cross-origin timing details are restricted unless the resource opts in with `Timing-Allow-Origin`; failed or blocked requests may provide incomplete or no useful entry. A zero field or missing entry is not proof of DNS, CORS, or ad blocking.

Search for the closest matching entry by sanitized URL and start time, then attach only timing fields you can interpret. Do not join solely by URL when several concurrent requests target the same endpoint.

For services you control, server and edge telemetry is decisive:

- If a correlated request arrived and returned `5xx`, investigate response exposure or connection loss.
- If a preflight arrived but the actual request did not, investigate CORS policy.
- If neither arrived and many clients/regions fail, investigate DNS, TLS, routing, or client-side blocking.
- If only one browser version or extension-heavy cohort fails, reproduce that client environment.

Absence from application logs is not proof the request never reached your infrastructure; CDN/WAF rejection may happen before the app. Correlate across layers.

## Alert on Rates, Not Exception Strings

Error messages vary by browser and localization. Build a denominator of attempted monitored operations and alert on outcome rates:

```text
network_error_unclassified / request_attempts
http_5xx / responses_with_visible_status
timeout / request_attempts
aborted_by_navigation / request_attempts
```

Segment first by stable operation, release, origin class, browser family, and broad region. Require minimum volume and compare telemetry health. A spike in "Failed to fetch" from the telemetry exporter itself can cause all other browser data to disappear, so accept/attempt ratios at the ingestion service are important.

Synthetic browsers from multiple regions can provide controlled reproduction, but they are corroboration rather than a substitute for real users. Run with production CSP, service worker, credentials policy, and representative network conditions.

## Official Documentation

- [Window.fetch behavior and exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [Fetch Standard: network errors and filtered responses](https://fetch.spec.whatwg.org/)
- [MDN CORS error guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Resource_timing)

## Conclusion

`TypeError: Failed to fetch` is deliberately broad, so production JavaScript cannot always name the root cause. Separate visible HTTP responses from rejections, identify locally provable aborts and timeouts, retain normalized request context, and leave the residual class as an honest network error. Server, edge, CSP, CORS, Resource Timing, and synthetic evidence can then narrow the incident without inventing a status the browser never exposed or collecting sensitive request data.
