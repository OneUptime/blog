# Validation Summary: Why Do Trace IDs in Logs Fail to Link to Traces? Checking Formats, Sampling, and Data Sources

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing and logs data models
- W3C Trace Context
- OpenTelemetry SDK head sampling
- OpenTelemetry Collector tail sampling
- Grafana
- Grafana Tempo
- Grafana Loki derived fields and structured metadata
- OTLP Logs

## Sources Consulted
- [OpenTelemetry Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [OpenTelemetry Tracing SDK: Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry Sampling Concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Grafana: Configure Trace to Logs Correlation](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/)
- [Grafana: Configure the Loki Data Source](https://grafana.com/docs/grafana/latest/datasources/loki/configure/)
- [Grafana: Tempo Data Source Additional Settings](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/additional-settings/)

## Issues Found
- The Loki derived-field regular expression required the colon and value in the stored JSON log line to have no intervening whitespace, so it did not match the post's own JSON example. Changed the expression from `"trace_id":"([0-9a-f]{32})"` to `"trace_id"\s*:\s*"([0-9a-f]{32})"` so it accepts valid JSON whitespace while preserving the single trace-ID capture group Grafana requires.

## Review Notes
- The Grafana provisioning example correctly doubles the dollar sign in `$${__value.raw}` to prevent environment-variable interpolation during YAML provisioning.
- Grafana data-source provisioning fields and correlation behavior can vary by release; the post appropriately tells readers to check the schema for their installed version and test against the stored log representation.
- The claims about identifier size and validity, optional log trace-context fields, sampled versus recording spans, independent span-ID generation, timestamp semantics, and avoiding trace IDs as Loki labels agree with the current specifications and official documentation.
