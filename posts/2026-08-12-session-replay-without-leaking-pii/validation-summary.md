# Validation Summary: Session Replay Without Leaking PII: Masking Inputs, URLs, DOM Text, and Network Payloads

## Status
validated

## Post Type
Technical privacy and implementation guide

## Technologies Covered
- Browser session replay
- JavaScript and browser URL APIs
- rrweb 2.x (`@rrweb/record` and `@rrweb/types`)
- Sentry Session Replay
- Datadog Session Replay and Browser RUM
- OpenTelemetry URL semantic conventions
- W3C Trace Context
- OWASP application logging guidance

## Sources Consulted
- rrweb recording guide: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/guide.md
- rrweb recorder package documentation: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/packages/record/README.md
- rrweb recorder source for input masking, metadata events, and iframe aggregation: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/packages/rrweb/src/record/index.ts
- rrweb input observer source: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/packages/rrweb/src/record/observer.ts
- rrweb snapshot source for attributes, blocking, and iframe serialization: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/packages/rrweb-snapshot/src/snapshot.ts
- rrweb event type definitions: https://github.com/rrweb-io/rrweb/blob/3deb6e7da4528ddb33b5b7ff6a3e805d4ed14930/packages/types/src/index.ts
- Sentry Session Replay privacy controls: https://docs.sentry.io/platforms/javascript/session-replay/privacy/
- Sentry Session Replay setup and sampling: https://docs.sentry.io/platforms/javascript/session-replay/
- Sentry replay session lifecycle and manual controls: https://docs.sentry.io/platforms/javascript/session-replay/understanding-sessions/
- Datadog Session Replay privacy options: https://docs.datadoghq.com/session_replay/privacy_options/
- Datadog Session Replay setup and recording controls: https://docs.datadoghq.com/session_replay/setup_and_configuration/
- Datadog Browser RUM tracking consent: https://docs.datadoghq.com/real_user_monitoring/application_monitoring/browser/advanced_configuration/#user-tracking-consent
- Datadog Browser SDK `RumInitConfiguration` API: https://datadoghq.dev/browser-sdk/interfaces/_datadog_browser-rum.RumInitConfiguration.html
- OpenTelemetry URL attribute conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- OpenTelemetry sensitive-data guidance: https://opentelemetry.io/docs/security/handling-sensitive-data/
- W3C Trace Context trace ID format: https://www.w3.org/TR/trace-context/#trace-id
- RFC 3986 fragment semantics: https://www.rfc-editor.org/rfc/rfc3986#section-3.5
- WHATWG HTML `Location.hash`: https://html.spec.whatwg.org/multipage/nav-history-apis.html#dom-location-hash
- OWASP Logging Cheat Sheet, data to exclude: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude

## Issues Found
- The URL-normalization helper was not connected to the rrweb recorder. rrweb emits `window.location.href` in each navigation metadata event, so the original `emit` callback would still have queued query strings and fragments. The recorder wrapper now sanitizes `EventType.Meta` events synchronously before enqueueing them, and the text clarifies that URL-bearing DOM attributes require separate blocking or sanitization.
- The text implied that `maskAllInputs: true` masks every input surface. rrweb only masks its supported input value types; radio and checkbox values, hidden and file controls, arbitrary attributes, and `<option>` text can remain recordable. The scope is now stated accurately, with instructions to keep sensitive data out of those surfaces, sanitize it, or block the containing element.
- Blocking was recommended when an element's dimensions reveal sensitive information, but rrweb deliberately preserves a blocked element's width and height in its placeholder. The explanation now states that dimensions remain visible and recommends a reviewed, fixed-size outer container when size is sensitive.
- `recordCrossOriginIframes: false` could be mistaken for a general iframe privacy control. It only disables cooperative aggregation from cross-origin child frames; same-origin iframe DOM and iframe URLs can still be serialized. The post now calls out that limitation and requires sensitive frames and their URLs to be handled separately.
- The network example used a nonconforming value for `trace_id`. It now uses a nonzero, 32-character lowercase hexadecimal W3C trace ID. A `start_time` field was also added so the example contains the start time listed in the preceding explanation.

## Review Notes
- The rrweb APIs and behavior were checked against current stable 2.1.1. The post correctly uses the modern `@rrweb/record` entry point and now tells readers to pin matching recorder and type packages.
- Sentry's current defaults mask text and input values and block media on the client. For consent withdrawal, exact stop/discard behavior is version-specific: a plain `stop()` may flush pending data, while `stop({ flush: false })` is available in recent SDK versions. The post's instruction to use the SDK-supported stop and discard mechanisms is therefore appropriate.
- Datadog's privacy guide says an omitted browser privacy setting defaults to `mask`, while the current Browser SDK API reference lists `mask-user-input` as the default. The post explicitly recommends `defaultPrivacyLevel: 'mask'`, so it does not rely on this documentation discrepancy.
- All seven documentation links already present in the post returned HTTP 200 and pointed to the intended resources during validation.
