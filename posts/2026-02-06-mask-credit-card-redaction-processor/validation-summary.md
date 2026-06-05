# Validation Summary: How to Mask Credit Card Numbers in OpenTelemetry Span Attributes Using the

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib redaction processor
- OpenTelemetry Collector debug exporter
- OpenTelemetry Python tracing API
- YAML Collector configuration
- Regular expressions for credit card masking

## Sources Consulted
- OpenTelemetry Collector Contrib redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/

## Issues Found
- The post described the redaction processor as "blocking, masking, or hashing matches." I changed this to clarify that the processor retains allowed attributes, removes attributes that are not allowed, and masks or hashes matching attribute values.
- The post said blocked value matches replace the value with `****`. I changed this to state that the matching part is masked with fixed-length asterisks unless a hash function is configured, which matches the current redaction processor documentation.
- The key-based blocking example used `blocked_keys`, but the current redaction processor configuration field is `blocked_key_patterns`. I updated the field name.
- The key-based blocking section said matching keys are blocked entirely. Current documentation says `blocked_key_patterns` applies masking to values of matching keys. I updated the comments and explanation to distinguish removal of non-allowed keys from masking values for matching key patterns.

## Review Notes
The regex examples are syntactically valid YAML string values and are suitable for the card formats shown in the post, but they are examples rather than a complete payment-card validation system. They do not perform Luhn validation and the Discover examples do not cover every possible Discover BIN range.
