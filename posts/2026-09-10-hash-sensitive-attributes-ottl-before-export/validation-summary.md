# Validation Summary: Hash Sensitive Attribute Values with OTTL Before Export

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide.

## Technologies Covered

- OpenTelemetry Collector Contrib 0.160.0
- OTTL SHA256 and attributes processor hashing
- Python hashlib and pseudonymous identifiers

## Sources Consulted

- [SHA256 implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_sha256.go)
- [OTTL function contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Attributes processor actions and hashing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/attributesprocessor/README.md)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
- [Collector validate command implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.160.0/otelcol/command_validate.go)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed span and log hashing/deletion configurations and the Python reference command. Source uses string bytes and hex.EncodeToString, producing the expected deterministic 64-character SHA256 digest.
- Checked that raw-source deletion is independent of the string guard, preserving no raw numeric/map identifier when hashing is skipped. A second pass leaves the existing digest because the source key is absent.
- Confirmed the release-specific SHA1 distinction for the attributes processor. The article correctly limits claims about anonymity, low-entropy inputs, normalization, cardinality, and other copies of the identifier.
- Also inspected the retained authoring-run configuration result for this post: 2 fragments met their expected validity result. These earlier results were not rerun here; intentionally broken examples remain identified as such.
- Reviewed on 2026-09-10 against official documentation and tagged source. No new Collector runtime execution or backend integration test was performed during this review.
