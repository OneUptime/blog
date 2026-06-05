# Validation Summary: How to Make Your OpenTelemetry Pipeline GDPR-Compliant

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OpenTelemetry Collector attributes, transform, redaction, memory limiter, and batch processors
- OTLP receiver and exporter TLS configuration
- Grafana Tempo retention
- Grafana Loki retention
- Elasticsearch Index Lifecycle Management
- GDPR data protection concepts for observability pipelines

## Sources Consulted
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- GDPR Article 4, Article 17, Article 32, and Chapter V text: https://gdpr-info.eu/

## Issues Found
- The Python SDK example attempted to mutate `span.attributes` inside `SpanProcessor.on_end`. OpenTelemetry's trace SDK specification treats `OnEnd` as receiving an ended/readable span, and the Python SDK exposes normal mutation through `span.set_attribute` while the span is recording. I replaced the processor example with a helper that hashes configured identifier keys before calling `span.set_attribute`.
- The pseudonymization explanation described pseudonymization as reversible with additional information. GDPR defines pseudonymization as processing that prevents attribution without separately kept additional information, not necessarily a reversible transform. I updated the wording to match that definition.
- The right-to-erasure section implied that rotating or destroying a hash salt can automatically erase a user's data and make the remaining telemetry non-personal data. I changed this to state that salt rotation can reduce identifiability only when no other attributes identify the person, and that it is not a universal substitute for deletion.
- The data residency section stated that running a Collector or backend in a US region may itself violate GDPR. I updated this to clarify that cross-border transfers require an appropriate transfer mechanism and safeguards.

## Review Notes
The Collector configuration examples use current processor names and generally valid fields. The `attributes` processor hash action uses unsalted SHA-1, so the post correctly recommends stronger SDK-level hashing for identifiers that need pseudonymization. Loki retention also depends on running the compactor with a supported index type and 24-hour index period; this is a deployment caveat rather than an error in the snippet shown.
