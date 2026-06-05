# Validation Summary: How to Use GDPR Data Subject Access Requests for Telemetry Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- YAML configuration
- SQL
- Python
- GDPR data subject access and erasure workflows

## Sources Consulted
- GDPR Regulation (EU) 2016/679, Articles 4, 15, 17 and Recitals 26, 57, 59: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry semantic conventions, user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/user/
- OpenTelemetry semantic conventions, enduser attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/
- OpenTelemetry semantic conventions, client attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/client/
- OpenTelemetry semantic conventions, network attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- OpenTelemetry semantic conventions, HTTP attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- European Data Protection Board FAQ on anonymised and pseudonymised data: https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-difference-between_en

## Issues Found
- The Python pseudonymization example was described as a span processor/exporter wrapper and attempted to mutate `span.attributes` during export. OpenTelemetry Python exports `ReadableSpan` instances, which provide read-only access to span attributes, so this would not work as written. Replaced it with an instrumentation-time helper that calls `trace.get_current_span().set_attribute(...)` before export.
- The example used an undefined `get_secret(...)` helper. Replaced it with `os.environ["TELEMETRY_PSEUDONYM_KEY"]` while preserving the advice that the secret should come from a secure source.
- The attribute examples used deprecated network/HTTP attributes without identifying current replacements. Updated the text and code to include current `client.address` and `network.peer.address`, while retaining legacy `http.client_ip` and `net.peer.ip` as fields teams may still need to handle.
- The collector normalization snippet omitted `user.id`, which is present in current OpenTelemetry semantic conventions. Added `user.id` alongside `enduser.id`.
- The DSAR SQL example claimed to return traces and logs, but it only queried a `spans` table. Narrowed the wording and SQL comments to trace data.
- The erasure section stated that deleting a mapping entry effectively anonymizes all telemetry. That is too absolute under GDPR because pseudonymized data remains personal data if it can still be attributed to a person, for example by regenerating the pseudonym with a retained global HMAC key. Updated the section to require removing re-identification material and to note remaining linkability risk.
- The TTL deletion guidance implied a fixed 30-day purge response was generally acceptable. Updated it to reference GDPR response obligations, including erasure without undue delay and required response timing.
- The deletion script referenced undefined `mapping_store`, `audit_logger`, and `generate_dsar_id`. Updated the function signature to accept the mapping store, audit logger, and DSAR request ID explicitly.

## Review Notes
The collector YAML parses successfully and follows the documented Collector component structure and attributes processor action shape. The Python snippets are syntactically valid, but both remain illustrative: the mapping store, audit logger, and backend deletion endpoint must match the implementation and telemetry backend used in production.
