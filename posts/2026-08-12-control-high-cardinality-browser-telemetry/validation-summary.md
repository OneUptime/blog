# Validation Summary: Control High-Cardinality Browser Telemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Browser JavaScript
- URL, URLSearchParams, and URLPattern Web APIs
- OpenTelemetry semantic conventions and SDK limits
- OpenTelemetry Collector processors
- Prometheus metrics and labels
- Real User Monitoring and session replay
- Telemetry data minimization and pseudonymisation

## Sources Consulted
- OpenTelemetry URL semantic-convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry common attribute limits: https://opentelemetry.io/docs/specs/otel/common/#attribute-limits
- OpenTelemetry Metrics SDK cardinality limits: https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits
- OpenTelemetry Metrics SDK attribute limits: https://opentelemetry.io/docs/specs/otel/metrics/sdk/#attribute-limits
- OpenTelemetry browser resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/browser/
- OpenTelemetry guidance for handling sensitive data: https://opentelemetry.io/docs/security/handling-sensitive-data/
- OpenTelemetry semantic-convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Collector processor inventory: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector redaction processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Transformation Language functions: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/
- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- WHATWG URL Pattern Standard: https://urlpattern.spec.whatwg.org/
- MDN URLPattern API, constructor, and test method: https://developer.mozilla.org/en-US/docs/Web/API/URLPattern
- MDN URL constructor: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
- MDN URLSearchParams.get(): https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/get
- RFC 9110 HTTP Semantics, target URI: https://www.rfc-editor.org/rfc/rfc9110.html#section-7.1
- OWASP Logging Cheat Sheet, data to exclude: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude
- OWASP Session Management Cheat Sheet, session ID logging: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#logging-sessions-life-cycle-monitoring-creation-usage-and-destruction-of-session-ids
- OWASP AJAX Security Cheat Sheet, client-side secrets: https://cheatsheetseries.owasp.org/cheatsheets/AJAX_Security_Cheat_Sheet.html#never-transmit-secrets-to-the-client
- UK ICO pseudonymisation guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/
- UK ICO guidance on identifiers and identifiability: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/what-is-personal-data/what-are-identifiers-and-related-factors/
- RFC 2104, HMAC: https://www.rfc-editor.org/rfc/rfc2104.html

## Issues Found
- The introduction said each indexed-tag combination could create an index partition. Index partitions or shards are not generally created per tag combination. Changed the explanation to distinguish new metric time series from growth in backend index structures, and changed “unique per event” to the more accurate “often near-unique across the event population.”
- The post used “session ID” for telemetry correlation without clearly excluding authentication session tokens. Added an explicit distinction and consistently called the safe correlation key an observability session ID, because authentication session tokens must not be exported as telemetry replay or correlation keys.
- The statement that a random cache-buster is not personal data was too absolute. Changed it to say that it need not be personal, because identifiability and linkability depend on context.
- Product slugs were described alongside bounded route segments even though they are frequently unbounded variables. Clarified that slugs should be treated as variables unless a reviewed, bounded value set proves otherwise.
- The network-operation example combined method, host, and route into an unspecified operation string. Replaced it with the current OpenTelemetry fields `http.request.method`, `server.address`, and `url.template` so the example does not imply a non-standard HTTP span name.
- The hash discussion said hashing preserves exactly the same cardinality and that an unsalted hash can be “reversed.” Clarified that hashing does not materially reduce cardinality and that guessable identifiers can be matched by enumerating candidates against an unkeyed hash.
- The common OpenTelemetry attribute-limit defaults were incorrectly presented as applying generally to metric and resource attributes, and an unlimited value-length default was called a safety ceiling. Clarified that resource attributes should be exempt and metric attributes are exempt from the common limits. Added the Metrics SDK's separate default aggregation cardinality limit of 2,000 data points per metric per collection cycle and linked its specification.
- The dropped-attribute counter used Prometheus's `_total` naming without identifying the metric system. Clarified that the example is for Prometheus; OpenTelemetry Counter instrument names themselves should not append `_total`.
- The custom attribute `telemetry.schema_version` reused an existing OpenTelemetry semantic-convention namespace. Changed it to the application-owned example `myapp.telemetry.schema_version` in line with OpenTelemetry naming guidance.
- The post described weekly renaming of a bounded flag as high cardinality. Reworded this as schema and series churn that increases retained label sets over time, which more precisely describes the failure mode.

## Review Notes
The JavaScript examples are syntactically valid and produced the intended route-template and query-allowlist results on a current standards-compatible runtime. `URLPattern` reached Baseline in September 2025, so older browsers and embedded webviews may require feature detection, a conforming polyfill, or router-native matching. Its matches are case-sensitive and trailing-slash-sensitive by default, so a production route table should mirror the router's rules. `URLSearchParams.get()` uses the first value when a query key is repeated; applications with different duplicate-parameter semantics should validate with `getAll()` instead. Some Collector processors discussed at a high level are distribution-dependent and have signal-specific stability levels, so deployments should confirm that their chosen Collector distribution includes them. All links in the post resolved to the intended documentation during review.
