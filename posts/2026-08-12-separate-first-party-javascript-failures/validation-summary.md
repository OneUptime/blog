# Validation Summary: Separate First-Party JavaScript Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Browser error monitoring and ownership classification
- JavaScript `error` and `unhandledrejection` events
- `ErrorEvent`, `PromiseRejectionEvent`, and resource load errors
- JavaScript stack traces, source maps, and release artifacts
- URL parsing and extension URL schemes
- Cross-Origin Resource Sharing (CORS) and the HTML `crossorigin` attribute
- Chrome, Firefox, and Safari browser extensions
- Sentry `allowUrls` and `thirdPartyErrorFilterIntegration`

## Sources Consulted
- [MDN `Window` error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)
- [MDN `HTMLElement` error event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/error_event)
- [MDN `EventTarget.addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [MDN `Window` `unhandledrejection` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [MDN `PromiseRejectionEvent.reason`](https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent/reason)
- [MDN `Error.prototype.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack)
- [WHATWG HTML runtime script errors](https://html.spec.whatwg.org/multipage/webappapis.html#runtime-script-errors) and [exception reporting](https://html.spec.whatwg.org/multipage/webappapis.html#report-an-exception)
- [WHATWG HTML unhandled promise rejections](https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections)
- [MDN `crossorigin` HTML attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
- [MDN Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [WHATWG Fetch CORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials) and [CORS caching guidance](https://fetch.spec.whatwg.org/#cors-protocol-and-http-caches)
- [Chrome content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome `scripting.ExecutionWorld`](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld)
- [Chrome web-accessible resources and extension fingerprinting](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)
- [MDN `runtime.getURL()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getURL) and [Firefox web-accessible resources](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)
- [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- [Sentry JavaScript error filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/) and [`allowUrls` configuration](https://docs.sentry.io/platforms/javascript/configuration/options/#allowUrls)
- [UK ICO pseudonymisation guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)

## Issues Found
- Resource load errors are dispatched at loading elements and do not bubble; the capture-phase listener on `window` observes them during event propagation. Corrected wording that previously implied both resource failures and script exceptions were `window` events.
- The example transmits stack traces, but the sanitization guidance named only messages, URLs, and rejection values. Added stack traces because they can also contain sensitive messages, filenames, and URLs.
- A plain hash of an extension identifier can remain linkable and can be matched against a public catalogue of known identifiers. Replaced the plain-hash recommendation with suppression by default or a keyed, access-controlled pseudonym when aggregation is necessary.
- Sentry's `allowUrls` checks the top stack-frame file URL for captured exceptions, so it is not an any-owned-frame classifier and can discard a mixed stack with an external throw site. Added this limitation and clarified that `thirdPartyErrorFilterIntegration` marks application files at build time and evaluates frames at runtime.
- An opaque `Script error.` event has an empty filename and therefore does not itself reveal the throwing script host. Restricted host-based grouping to cases with separate load or integration telemetry and labeled temporal proximity as correlation rather than proof.

## Review Notes
The JavaScript snippets are syntactically valid and use current browser APIs; the release-manifest JSON is valid, and focused `classifyFrame()` cases passed for the three listed extension schemes, release artifacts, remote HTTP(S), other schemes, invalid URLs, and empty input. `Error.prototype.stack` remains non-standard and its format varies by browser, which supports the post's recommendation to use a maintained stack parser. Sentry's `thirdPartyErrorFilterIntegration` currently requires a browser SDK version of at least 8.10.0 plus a supported bundler integration, and it does not work with Sentry's Loader Script or CDN bundles. `Vary: Origin` is safe in the shown response but is only necessary when the response's CORS behavior varies by request origin. All external documentation links in the post resolved successfully, and no deprecated APIs were found.
