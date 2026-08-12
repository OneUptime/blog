# Validation Summary: Why Does Browser Monitoring Report Status 0? Distinguishing CORS, Offline, Abort, and Ad-Blocker Failures

## Status
validated

## Post Type
Technical guide / browser monitoring reference

## Technologies Covered
- HTTP status codes
- JavaScript Fetch API
- XMLHttpRequest
- AbortController, AbortSignal, and AbortSignal.timeout()
- Cross-Origin Resource Sharing (CORS)
- Content Security Policy (CSP) and SecurityPolicyViolationEvent
- Navigator.onLine and online/offline events
- Browser extensions and request blocking
- Resource Timing and Timing-Allow-Origin
- Browser monitoring metrics and failure classification

## Sources Consulted
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) - HTTP status-code semantics and retry safety for non-idempotent requests.
- [WHATWG XMLHttpRequest Standard](https://xhr.spec.whatwg.org/) - `status` exposure, ready states, and the `load`, `error`, `abort`, and `timeout` event algorithms.
- [WHATWG Fetch Standard](https://fetch.spec.whatwg.org/) - network errors, CORS failures, opaque and opaque-redirect filtered responses, response fields, redirects, and `fetch()` rejection behavior.
- [WHATWG DOM Standard: AbortController and AbortSignal](https://dom.spec.whatwg.org/#interface-abortsignal) - abort reasons, dependent signals, `AbortSignal.timeout()`, and promise rejection with the signal's reason.
- [WHATWG HTML Standard: NavigatorOnLine](https://html.spec.whatwg.org/multipage/system-state.html#dom-navigator-online) - the intentionally unreliable online-state heuristic and transition events.
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/) - `connect-src`, request blocking, violation events, enforcement versus report-only dispositions, and CSP reporting.
- [W3C Reporting API](https://www.w3.org/TR/reporting-1/) - reporting endpoints and best-effort, non-guaranteed delivery.
- [W3C Resource Timing](https://www.w3.org/TR/resource-timing/) - cross-origin timing restrictions, `Timing-Allow-Origin`, partial entries for network failures, and absent entries for failed fetch preconditions.
- [MDN: CORS errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors) and [CORS request did not succeed](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSDidNotSucceed) - limits of console diagnostics and non-CORS causes of generic CORS-labelled failures.
- [Chrome Extensions: declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) and [MDN WebExtensions: webRequest.onBeforeRequest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeRequest) - extension capabilities to block, redirect, or modify requests.
- The seven MDN/WHATWG documentation links in the post were opened and verified to resolve to the intended current references.

## Issues Found
1. **XHR status availability was described too broadly.** The post said `XMLHttpRequest.status` remains `0` until the request completes. The XHR algorithm installs the response before moving to `HEADERS_RECEIVED`, so the real status is already exposed while the response body may still be loading. Changed the text to say status is `0` before response headers are received and when an error leaves no readable response.
2. **Fetch status-zero response wording and opaque-redirect URL visibility needed correction.** A `no-cors` request does not always resolve; network and policy failures can still reject it. The wording now says it can resolve with an opaque response and scopes the list to responses with which `fetch()` can fulfill. The post also previously said opaque-redirect responses hide all URL details, but the Fetch Standard preserves the URL that produced the redirect while hiding the status, headers, body, and `Location` target. Corrected that distinction.
3. **Fetch abort classification could mislabel racing or unrelated failures.** Checking only `signal.aborted` is insufficient because request construction can fail before Fetch checks the signal, and a signal can become aborted after another rejection wins the race. Both Fetch examples now require the rejection value to match `signal.reason`. The general example also distinguishes a matching `TimeoutError`, safely handles omitted options, and uses `error?.name ?? null` because an abort reason may legally be any JavaScript value, including `null`.
4. **Report-only CSP events were incorrectly classified as blocked requests.** `securitypolicyviolation` fires for both enforced and report-only policies. The table now requires `disposition === "enforce"` before classifying `csp_blocked`, and the listener labels report-only events as `csp_report_only_violation`. The reporting-endpoint wording was also changed from "permitted" to "reachable" to avoid implying that CSP reporting requests must be allowlisted by `connect-src`.
5. **A generic CORS-labelled console message was treated as proof of a CORS protocol failure.** Browser consoles can use a generic CORS failure label for DNS, TLS, mixed-content, and extension failures. The table and explanation now require a specific CORS protocol diagnostic for reproduction-level confirmation and leave generic failures unclassified.
6. **The monitoring-rate description had inconsistent and overlapping denominators.** The introduction promised an attempted-request denominator while `http_error_rate` intentionally used completed readable responses. It now says the formulas use explicit denominators. The `network_error_rate` numerator was narrowed to residual unclassified network errors so it does not overlap the separately tracked abort, timeout, and CSP categories.

## Review Notes
- All JavaScript APIs used are current and non-deprecated. The examples use application-specific helper placeholders such as `report()`, `safeAbortCategory()`, and `safeOrigin()` intentionally; the browser API usage around those helpers is valid.
- The XHR terminal-event distinctions, handling of HTTP `404`/`503`, CORS opacity, `navigator.onLine` caveats, CSP `connect-src` coverage, ad-blocker uncertainty, mutation retry guidance, and Resource Timing limitations were verified and are technically sound after the corrections above.
- No terminal commands, configuration files, or version-specific claims appear in the post.
- All external documentation links resolve to the intended resources. The author link redirects from `www.github.com` to GitHub's canonical URL and remains functional.
