# Validation Summary: Prevent Correlation ID Injection, Cardinality, and Header Abuse

## Status

validated

## Post Type

Technical security and observability guide with executable Node.js examples.

## Technologies Covered

- JavaScript ES modules and Node.js HTTP and crypto APIs
- HTTP request headers, parser limits, and trust boundaries
- JSON structured logging and log injection prevention
- Prometheus metrics and label cardinality
- Grafana Loki stream labels and structured metadata
- Elasticsearch keyword mappings and field cardinality

## Sources Consulted

- Node.js HTTP API: https://nodejs.org/api/http.html
- Node.js cryptographic random bytes: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- Node.js release support information: https://nodejs.org/en/about/previous-releases
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- ECMAScript JSON string escaping: https://tc39.es/ecma262/multipage/structured-data.html#sec-quotejsonstring
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/
- Prometheus exposition format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Grafana Loki cardinality: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki structured metadata: https://grafana.com/docs/loki/latest/get-started/labels/structured-metadata/
- Elasticsearch keyword fields: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword
- Elasticsearch mapping explosion: https://www.elastic.co/docs/troubleshoot/elasticsearch/mapping-explosion

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Both JavaScript blocks were combined and executed on Node.js v24.1.0. The test harness used an ephemeral loopback port and captured serialized log output; the selector and server configuration were otherwise unchanged. All 14 selector cases passed, covering accepted, missing, duplicate, untrusted, invalid length, uppercase, whitespace, newline, Unicode, oversized, and non-string input.
- A batch of 100 concurrent requests produced 100 distinct response IDs, none equal to the supplied ID. Application logs contained valid JSON with generated IDs and the expected bounded reason. Duplicate header occurrences were preserved and detected. An oversized header received HTTP 431, and a NUL-containing header received HTTP 400 without application logging.
- The HTTP options and headersDistinct API are supported and non-deprecated. headersDistinct was added in Node.js 18.3.0 and 16.17.0; the illustrated timeout constructor options require Node.js 18 or later. Timeout enforcement for incomplete requests is checked periodically through connectionsCheckingInterval (30 seconds by default), so the illustrated timeout settings are not exact wall-clock deadlines. Timeout timing was reviewed against documentation, not measured.
- The loopback listener is suitable for local execution or exposure through a proxy. An authenticated internal deployment must establish its own trust decision and forward the selected ID consistently; the sample does not implement authentication or downstream forwarding.
- JSON serialization escapes control characters, while input validation independently bounds syntax and size. The guidance to avoid raw rejected input and sensitive metadata agrees with OWASP.
- The metric lines are valid illustrative samples with bounded labels. The metric reason valid can be mapped from the selector outcome accepted; no instrumentation implementation is supplied or implied. Public requests intentionally receive the untrusted outcome before other validation reasons are considered.
- Loki structured metadata requires a compatible configuration, including schema version 13 or later and structured metadata enabled. The post appropriately qualifies this as supported metadata and also allows JSON content.
- Elasticsearch keyword fields support exact matching. The application's 32-character contract supplies the size bound; keyword alone does not enforce that contract. ignore_above can prevent indexing oversized values but does not reject them or remove them from stored source. Stable field names avoid mapping growth from arbitrary IDs.
- The documentation links resolve to the intended official resources. No terminal commands appear in the post. Prometheus, Loki, and Elasticsearch guidance was verified against documentation; no telemetry backend or gateway was deployed for this review.
