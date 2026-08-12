# Validation Summary: How to Monitor Failed Fetch Calls When the Browser Exposes Only `TypeError: Failed to fetch`

## Status

validated

## Post Type

Technical guide with JavaScript implementation examples

## Technologies Covered

- JavaScript
- Fetch API (`fetch()`, `Request`, and `Response`)
- `AbortController` and `AbortSignal`
- Cross-Origin Resource Sharing (CORS) and `no-cors` responses
- Content Security Policy (CSP) and mixed-content blocking
- Resource Timing API and `Timing-Allow-Origin`
- `navigator.onLine`, Page Visibility, and service workers
- Real User Monitoring (RUM), OpenTelemetry Fetch instrumentation, and synthetic monitoring

## Sources Consulted

- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/)
- [WHATWG DOM Standard: AbortController and AbortSignal](https://dom.spec.whatwg.org/#aborting-ongoing-activities)
- [W3C Resource Timing](https://www.w3.org/TR/resource-timing/)
- [MDN: Window.fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: Request() constructor](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request)
- [MDN: Request.mode](https://developer.mozilla.org/en-US/docs/Web/API/Request/mode)
- [MDN: Response.type](https://developer.mozilla.org/en-US/docs/Web/API/Response/type)
- [MDN: CORS errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [MDN: Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN: AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [MDN: AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [MDN: Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Resource_timing)
- [MDN: Timing-Allow-Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Timing-Allow-Origin)
- [MDN: Content-Security-Policy connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [OpenTelemetry JavaScript Fetch instrumentation](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch)
- [Chromium Fetch browser tests](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/extensions/fetch_apitest.cc)

## Issues Found

No technical issues found.

## Review Notes

- The JavaScript wrapper and classification functions are syntactically valid. `HttpError`, `safeRequestContext`, `safeErrorName`, and `reportRequest` are application-specific hooks that a production implementation must supply; their omission is appropriate for the focused example. Those helpers must preserve the post's stated no-throw and data-allowlisting guarantees.
- `AbortSignal.timeout()` measures active time, so its timer can pause while a document is in the back-forward cache or a worker is suspended. This does not invalidate the example, but it matters if an application interprets the policy as strict wall-clock time.
- A fulfilled opaque response does not prove an HTTP success status. The post correctly handles it as a separate `opaque_response` outcome and explains that JavaScript cannot verify its underlying status.
- Resource Timing entries for DNS, TCP, or TLS failures can be sparse, while failures of fetch preconditions such as CORS, CSP, or mixed-content checks can produce no entry. The post's cautious treatment of timing data is consistent with the current specification.
- All seven external documentation links included in the post resolved successfully during validation. No changes to `README.md` were required.
