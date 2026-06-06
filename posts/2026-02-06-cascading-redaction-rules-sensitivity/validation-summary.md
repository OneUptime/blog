# Validation Summary: How to Configure Cascading Redaction Rules for Different Sensitivity Levels

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector redaction processor
- OpenTelemetry semantic conventions
- YAML Collector configuration
- Python-style integration test pseudocode

## Sources Consulted
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector redaction processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry semantic convention registry for network attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- OpenTelemetry semantic convention registry for general client/server attributes: https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OpenTelemetry semantic convention registry for user attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/user/
- OpenTelemetry semantic convention registry for enduser attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/enduser/

## Issues Found
- The post claimed the attributes processor hashes values with SHA-256 and used a 64-character hex length assertion. The official attributes processor documentation says the `hash` action uses SHA-1, so I changed the heading to SHA-1 and updated the test expectation to 40 characters.
- The post used `net.peer.ip`, which is deprecated in the current semantic convention registry. I replaced it with `server.address` in the masking examples and classification document, while keeping `client.address`.
- The post described the redaction processor safety net as a general catch-all regex scan. The official redaction processor documentation applies `blocked_values` to retained attribute values, so I clarified the wording to say it is an attribute-value regex catch-all.
- The high-sensitivity classification said hashing provides correlation "without exposure." Because unsalted SHA-1 hashing reduces direct exposure but is not strong protection for low-entropy identifiers, I adjusted the phrase to "with reduced direct exposure."

## Review Notes
The configuration uses current Collector component syntax for processor chaining, attributes processor `delete` and `hash` actions, transform processor OTTL statement groups, and redaction processor `allow_all_keys` with `blocked_values`. For stronger protection of low-entropy identifiers such as emails or user IDs, future guidance could consider keyed hashing where available, but that would require changing the processor strategy rather than a small correctness edit.
