# Why Browser Monitoring Reports Status 0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Status 0, CORS, Fetch API, XMLHttpRequest, Ad Blockers, Network Error

Description: Understand what browser status 0 means across Fetch and XMLHttpRequest and classify only the causes that browser evidence can actually prove.

---

HTTP does not define a status code `0`. When browser monitoring shows status 0, it means the monitoring layer did not receive a script-readable HTTP status-or it observed a deliberately opaque response. It does not mean the server returned zero, and it does not identify one root cause.

CORS, offline conditions, DNS/TLS failures, Content Security Policy (CSP), aborts, extensions, and opaque `no-cors` responses can all end up near the same dashboard label. Some are failures, one can be a successful but unreadable response, and some are normal application control flow. The first step is to retain which browser API and event produced the value.

## Status 0 Means Different Things by API

### XMLHttpRequest

`XMLHttpRequest.status` is `0` before response headers are received and when an XHR error prevents a readable response. Code that samples `status` too early can therefore manufacture false failures. Use terminal events rather than polling the property.

```js
const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/profile");

xhr.addEventListener("load", () => {
  report({ outcome: "response", status: xhr.status });
});
xhr.addEventListener("error", () => {
  report({ outcome: "network_error", status: xhr.status });
});
xhr.addEventListener("abort", () => {
  report({ outcome: "aborted", status: xhr.status });
});
xhr.addEventListener("timeout", () => {
  report({ outcome: "timeout", status: xhr.status });
});

xhr.send();
```

An HTTP `404` or `503` completes the request and fires `load`; the application must inspect the nonzero status. The `error`, `abort`, and `timeout` terminal events should not be collapsed merely because their `status` property is zero.

### Fetch

For a normal Fetch network error or CORS rejection, `fetch()` rejects. JavaScript receives no `Response` object to inspect, so a monitoring SDK may normalize the missing status to `0`.

The `fetch()` function can also fulfill with script-visible responses whose status is zero:

- a `no-cors` cross-origin request can resolve with an **opaque** response;
- a manually handled redirect can expose an **opaque-redirect** response.

Their actual HTTP status, headers, and body are intentionally hidden. An opaque response also hides its URL; an opaque-redirect response exposes the URL that produced the redirect, but not the `Location` target. This is not proof the network request failed.

```js
try {
  const response = await fetch(url, options);
  report({
    outcome: response.type === "opaque" ? "opaque" : "response",
    responseType: response.type,
    status: response.status,
  });
} catch (error) {
  const signal = options?.signal;
  const signalCausedRejection =
    signal?.aborted && Object.is(error, signal.reason);
  let outcome = "network_error";
  if (signalCausedRejection) {
    outcome = error?.name === "TimeoutError" ? "timeout" : "aborted";
  }

  report({
    outcome,
    status: null, // There was no script-visible Response.
    errorName: error?.name ?? null,
  });
}
```

Using `null` or `status_available: false` internally is clearer than inventing zero for a rejected Fetch. Preserve zero only when it is the API's actual exposed value or when compatibility requires it, and always keep the outcome and response type beside it.

## A Classification Table

| Evidence | Defensible classification | What remains unknown |
| --- | --- | --- |
| XHR `abort` event or Fetch rejection matching the supplied signal's abort reason | `aborted` | Whether the user, route, or code initiated it unless caller context says |
| XHR `timeout` event or Fetch rejection matching an `AbortSignal.timeout()` signal's reason | `timeout` | Which network stage was slow |
| `Response.type === "opaque"` and status `0` | `opaque_response` | Actual HTTP status and response content |
| `securitypolicyviolation` with `effectiveDirective === "connect-src"` and `disposition === "enforce"` matching destination | `csp_blocked` | Whether another layer would also have failed |
| `navigator.onLine === false` at failure | `network_error_offline_hint` | Whether the OS heuristic reflects destination reachability |
| Browser console reports a specific CORS protocol failure during reproduction | `cors_confirmed_in_reproduction` | Whether every production sample has the same cause |
| No response, request absent from all controlled edge logs | `network_error_unclassified` | DNS, TLS, routing, policy, extension, or local network cause |
| A known blocker reproduces the exact request failure | `client_blocking_reproduced` | Prevalence and whether all field samples used that blocker |

The table deliberately leaves unknowns. Browser security boundaries make some causes indistinguishable to page JavaScript.

## Distinguishing Aborts Reliably

Aborts are the easiest class because your code can preserve intent. Every controlled cancellation should carry a reason category.

```js
const controller = new AbortController();

router.onBeforeNavigate(() => {
  controller.abort(new DOMException("route_superseded", "AbortError"));
});

try {
  await fetch("/api/recommendations", { signal: controller.signal });
} catch (error) {
  if (
    controller.signal.aborted &&
    Object.is(error, controller.signal.reason)
  ) {
    report({
      outcome: "aborted",
      abortReason: safeAbortCategory(controller.signal.reason),
    });
  } else {
    report({ outcome: "network_error_unclassified" });
  }
}
```

Do not send arbitrary abort reasons; they may contain user or application data. Map reasons to an allowlist such as `route_superseded`, `component_unmounted`, `user_cancelled`, or `timeout`.

An abort after the server has processed a mutation can still leave the client unsure of the outcome. For write operations, use idempotency keys and a reconciliation endpoint rather than blindly retrying every status-zero event.

## Offline Is a Hint, Not a Verdict

`navigator.onLine` reflects browser and operating-system heuristics. A laptop connected to a Wi-Fi access point with no internet may still be "online." DNS, VPN, firewall, captive portal, and destination-specific outages can occur while the property is true.

Record its value at failure and listen for `online`/`offline` transitions to improve UX, but classify it as a hint:

```js
const networkEvidence = navigator.onLine ? "online_hint" : "offline_hint";
```

Do not use a successful request to an unrelated public endpoint as a universal connectivity test. It creates privacy, availability, and CSP dependencies and still says nothing definitive about the intended API.

## Proving CSP Blocks

Fetch, XHR, WebSocket, EventSource, and Beacon destinations are governed by CSP `connect-src` (or `default-src` when `connect-src` is absent). A CSP block may appear as a network error or status zero to request instrumentation.

The page can observe a policy violation when its bootstrap code is running:

```js
document.addEventListener("securitypolicyviolation", (event) => {
  if (event.effectiveDirective === "connect-src") {
    reportLocallyOrQueue({
      outcome:
        event.disposition === "enforce"
          ? "csp_blocked"
          : "csp_report_only_violation",
      directive: event.effectiveDirective,
      disposition: event.disposition,
      blockedOrigin: safeOrigin(event.blockedURI),
    });
  }
});
```

Do not export full blocked URLs; query strings can contain secrets. The report may itself be unable to reach the blocked telemetry destination, so also configure CSP reporting to a reachable endpoint. CSP reports are best effort, not guaranteed delivery. If CSP blocks the monitoring script from loading at all, its JavaScript listener cannot run; server-side report collection and telemetry coverage ratios become essential.

Test new policies with `Content-Security-Policy-Report-Only`, but remember that report-only traffic can include browser extensions and other noise. Filter and aggregate safely before changing enforcement.

## Why CORS Is Hard to Identify in Page Code

CORS decides whether a cross-origin response can be exposed to the caller. If preflight fails or required response headers are missing, Fetch returns a network error and XHR exposes no readable response. The browser console may identify a specific CORS protocol failure to a developer, but generic CORS-labelled failures can also cover DNS, TLS, mixed-content, or extension failures. Page JavaScript does not receive the detailed reason.

Use external evidence:

1. Look for the `OPTIONS` preflight in edge/server logs.
2. Confirm the actual page `Origin`, credentials mode, method, and request headers.
3. Ensure CORS headers appear on error responses and redirects, not only `200`.
4. Reproduce in the affected browser with DevTools Network and Console.
5. Compare the onset with gateway, CDN, DNS, and CSP changes.

Never switch an API request to `mode: "no-cors"` merely to remove a CORS error. The resulting opaque response has status zero and cannot provide JSON, headers, or proof of success.

## Ad Blockers and Extensions

An extension can block or modify a request before it reaches your server. From the page, that may be indistinguishable from another Fetch network error. There is no standard, reliable browser API that says "this request was blocked by an ad blocker," and probing for particular extensions is brittle and invasive.

Use careful language:

- `client_blocking_possible` when the destination or naming pattern is commonly filtered;
- `client_blocking_reproduced` when a controlled browser with a known ruleset reproduces it;
- never label an individual production user as running a blocker based only on status zero.

Avoid deceptive attempts to bypass an explicit user choice. A first-party, purpose-named ingestion endpoint and a small first-party SDK can reduce accidental third-party failures, but users and extensions may still block them. Respect consent and document essential versus optional telemetry.

## Quantify and Alert Correctly

Build rates with explicit denominators:

```text
http_error_rate = HTTP error responses / completed readable responses
network_error_rate = residual unclassified network-error attempts / attempts
abort_rate = controlled aborts / attempts
opaque_rate = opaque responses / attempts
```

Group by normalized operation, destination origin class, release, browser family, and broad region. Keep CSP-confirmed, controlled-abort, timeout, and residual network errors separate. Require minimum volume and verify telemetry acceptance before paging.

Resource Timing can add context, but cross-origin details require `Timing-Allow-Origin`, and blocked requests may have incomplete or absent entries. Server, CDN, WAF, and synthetic evidence must complete the picture.

## Official Documentation

- [XMLHttpRequest status](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/status)
- [Fetch Standard: network and opaque responses](https://fetch.spec.whatwg.org/)
- [Using the Fetch API and `no-cors`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN CORS errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [CSP `connect-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [SecurityPolicyViolationEvent](https://developer.mozilla.org/en-US/docs/Web/API/SecurityPolicyViolationEvent)
- [Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)

## Conclusion

Status zero is a missing-or-opaque response signal, not an HTTP response code and not an offline detector. Preserve the originating API, terminal event, response type, abort signal, CSP evidence, and connectivity hint. Classify only what those facts prove, then correlate residual network errors with browser reproduction and server infrastructure. Honest unknowns are far more useful than a dashboard that confidently mislabels CORS, cancellations, and blockers as the same outage.
