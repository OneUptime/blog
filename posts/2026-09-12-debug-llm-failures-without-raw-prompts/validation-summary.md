# Validation Summary: Debug LLM Failures Without Raw Prompts: Hashes and Selective Capture

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Python `hashlib`, `hmac`, and `json` standard-library modules
- HMAC-SHA-256 keyed fingerprints
- OpenTelemetry telemetry processing and sensitive-data handling
- LangSmith input and output masking
- Langfuse client-side and OpenTelemetry span masking
- LLM observability, prompt correlation, and selective content capture

## Sources Consulted

- [OpenTelemetry: Handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [Python documentation: `hmac` — Keyed-Hashing for Message Authentication](https://docs.python.org/3/library/hmac.html)
- [RFC 2104: HMAC—Keyed-Hashing for Message Authentication](https://www.rfc-editor.org/rfc/rfc2104)
- [LangSmith: Prevent logging of sensitive data in traces](https://docs.langchain.com/langsmith/mask-inputs-outputs)
- [Langfuse: Masking](https://langfuse.com/docs/observability/features/masking)

## Issues Found
No technical issues found.

## Review Notes
The Python example was syntax-checked and executed. It produces a 64-character HMAC-SHA-256 hexadecimal digest, remains stable when equivalent dictionaries have different key insertion order, and changes when the tenant scope changes. Its documented constraints are accurate: the key must be bytes, the messages must be JSON-compatible, and serialization changes affect the fingerprint.

The security guidance is appropriately qualified: keyed fingerprints provide correlation and resistance to guessing by parties without the key, but remain linkable pseudonymous data and do not reconstruct input. The OpenTelemetry documentation confirms both the small-input-space limitation of ordinary hashing and that Collector processors operate as post-processing after collection.

LangSmith currently supports hiding or transforming trace inputs and outputs. Langfuse currently recommends the Python `mask_otel_spans` export-stage hook; its older `mask` hook is legacy and covers only data set through Langfuse SDK APIs. The post does not prescribe the legacy hook and correctly advises readers to inspect exact field coverage and mask before telemetry leaves the application when that is the trust-boundary requirement.
