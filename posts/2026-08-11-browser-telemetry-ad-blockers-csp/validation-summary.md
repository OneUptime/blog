# Validation Summary: Browser Telemetry Disappears Behind Ad Blockers and CSP: How Much Data Are You Missing?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Browser real user monitoring (RUM) and telemetry delivery funnels
- Content Security Policy (CSP), including `script-src`, `connect-src`, nonces, report-only policies, and violation reporting
- Reporting API and `Reporting-Endpoints`
- `SecurityPolicyViolationEvent`
- Beacon API (`navigator.sendBeacon()`)
- Fetch/CORS and browser page lifecycle behavior
- Back/forward cache (bfcache), service workers, HTTP caching, and client-side SPA navigation
- Browser content blockers and extension request-filtering rules
- Telemetry sampling, batching, deduplication, and backend ingestion

## Sources Consulted

- [Content Security Policy Level 3](https://www.w3.org/TR/CSP/)
- [Reporting API](https://www.w3.org/TR/reporting-1/)
- [Beacon specification](https://www.w3.org/TR/beacon/)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [HTML Standard: navigation and session history](https://html.spec.whatwg.org/multipage/nav-history-apis.html)
- [Service Workers specification](https://www.w3.org/TR/service-workers/)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [Chrome Page Lifecycle API guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Chrome `declarativeNetRequest` API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [MDN: `connect-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [MDN: `Content-Security-Policy-Report-Only`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)
- [MDN: `Reporting-Endpoints`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints)
- [MDN: `SecurityPolicyViolationEvent`](https://developer.mozilla.org/en-US/docs/Web/API/SecurityPolicyViolationEvent)
- [MDN: `Navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [OpenTelemetry Protocol specification](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry JavaScript browser guidance](https://opentelemetry.io/docs/languages/js/getting-started/browser/)

## Issues Found

- The numerical funnel compared sampled-in events with collector-accepted and stored payloads. Because exporters can batch several events into one payload, partially accept a payload, and retry requests, those units are not reliably one-to-one. Changed the downstream counts to consistently represent events, with collector decoding and deduplication occurring before the accepted-event count.
- The post described a collector accepted-request counter as the first "durable" evidence that a payload reached the infrastructure. A server-side counter is not necessarily durably persisted, so this was corrected to the first "server-side" evidence.
- The statement that SPA route changes do not create document requests was too broad because an SPA can still perform a full-document navigation. It now specifically refers to client-side SPA route changes.

## Review Notes

The CSP header example uses the current `Reporting-Endpoints` plus `report-to` mechanism. A cross-origin reporting endpoint must support the Reporting API's CORS request, and deployments that require coverage in older browsers should assess whether the deprecated `report-uri` fallback is still needed. A WebSocket exporter would need an appropriate `wss:` source because the example's `https://rum.example.com` source does not authorize `wss://rum.example.com`. The application-defined CSP redaction helpers should handle non-URL `blockedURI` values and an empty `sourceFile`.

Beacon's keepalive quota is shared among in-flight keepalive requests, so a `false` return can reflect queued data beyond just the current payload. No version-specific claims were present.
