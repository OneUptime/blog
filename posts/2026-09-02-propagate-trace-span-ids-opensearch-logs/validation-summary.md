# Validation Summary: Add Trace and Span IDs to OpenSearch Logs

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered
- OpenTelemetry Logs Data Model and logging bridges
- W3C Trace Context
- OpenTelemetry Collector and Collector Contrib `file_log` receiver
- OpenTelemetry .NET log correlation
- OpenSearch Data Prepper 2.12 through 2.16
- OpenSearch index templates, mappings, and Query DSL
- OpenSearch Dashboards 3.5 datasets, workspaces, and trace-to-log correlations

## Sources Consulted
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry trace context in non-OTLP log formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Logs API](https://opentelemetry.io/docs/specs/otel/logs/api/)
- [OpenTelemetry Logs SDK](https://opentelemetry.io/docs/specs/otel/logs/sdk/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry .NET log correlation](https://opentelemetry.io/docs/languages/dotnet/logs/correlation/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [Collector OTLP receiver](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md)
- [Collector OTLP gRPC exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md)
- [Collector TLS configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md)
- [Collector Contrib file log receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md)
- [Collector Contrib parser behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/parsers.md)
- [Collector Contrib trace parsing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/trace.md)
- [Data Prepper 2.12 release notes](https://github.com/opensearch-project/data-prepper/blob/2.12.0/release/release-notes/data-prepper.release-notes-2.12.0.md)
- [Data Prepper OTLP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otlp-source/)
- [OpenSearch telemetry ingestion with Collector and Data Prepper](https://docs.opensearch.org/latest/observing-your-data/apm/configuring-telemetry-ingestion/)
- [Data Prepper 2.16 standard log index template](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/resources/logs-otel-v1-index-standard-template.json)
- [Data Prepper 2.16 index aliases](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConstants.java)
- [Data Prepper 2.16 sink template selection](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConfiguration.java)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch keyword field type](https://docs.opensearch.org/latest/mappings/supported-field-types/keyword/)
- [OpenSearch Dashboards 3.5 datasets](https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/datasets/)
- [OpenSearch Dashboards 3.5 correlations](https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/correlations/)
- [Current OpenSearch Dashboards datasets](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/datasets/)
- [Current OpenSearch Dashboards correlations](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/correlations/)
- [OpenSearch Dashboards 3.5 Discover Traces prerequisites](https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/discover-traces/)
- [OpenSearch Dashboards 3.5 sample configuration](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.5/config/opensearch_dashboards.yml)

## Issues Found
1. **Ambiguous span-creation claim:** The post said that creating an unrelated span at the logger produces a new trace ID. A normally created child span inherits the active trace ID; it is specifically a new root span that receives a new trace ID. Changed the sentence to warn against starting a root span instead of using the current request context.
2. **Missing workspace prerequisite:** The OpenSearch Dashboards setup omitted that workspaces are incompatible with OpenSearch Security multi-tenancy. Added the required `opensearch_security.multitenancy.enabled: false` setting when the Security plugin is installed.
3. **Overbroad no-current-span example:** The post stated that startup, background, and asynchronously detached work has no current span. Such work can propagate context or create its own span. Clarified that the failure applies when the work is uninstrumented and the log is emitted without an active context.

## Review Notes
- The Collector configuration uses the current `otlp_grpc` exporter component name. The former `otlp` exporter name became a deprecated alias when the component was renamed in Collector 0.144.0.
- Data Prepper 2.16's `log-analytics-plain` template and aliases match the post: `traceId` and `spanId` are keywords, `flags` is a long, `@timestamp` is `date_nanos`, `body` is text, string resource attributes are keywords, and the managed index pattern is `logs-otel-v1-*`.
- Standard OTLP log decoding produces a `time` field. Merely having an `@timestamp` mapping does not populate `@timestamp`; deployments that select it as the dataset timestamp must create it in a transform. Alternatively, select the stored `time` field. The post already instructs readers to map the fields actually stored.
- The `explore.discoverTraces.enabled` option remains marked experimental in the OpenSearch Dashboards sample configuration even though datasets and correlations are documented as introduced in 3.5.
- The referenced URLs resolve to the intended official documentation, and the JSON, YAML, OpenSearch API requests, index patterns, field names, and exact-match query approach are otherwise technically correct.
