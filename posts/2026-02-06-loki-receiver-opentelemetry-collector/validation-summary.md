# Validation Summary: How to Configure the Loki Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Loki receiver
- Grafana Loki push API
- Promtail
- OpenTelemetry transform, filter, batch, memory limiter, probabilistic sampler, and resource processors
- OpenTelemetry routing connector
- OTLP HTTP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib Loki receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/lokireceiver
- OpenTelemetry Collector Contrib Loki translator source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/translator/loki/loki_to_otlp.go
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector HTTP server configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/#ingest-logs
- Grafana Promtail agent documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Promtail configuration documentation: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/

## Issues Found
- The post described `resource_attributes` as a Loki receiver setting, but the Loki receiver only documents protocol endpoint settings and `use_incoming_timestamp`. I removed the unsupported receiver field and replaced it with transform processor examples that copy Loki label attributes to resource attributes.
- The post said Loki receiver labels become resource attributes by default. The receiver converts non-internal stream labels to log attributes. I corrected the explanation and label mapping examples.
- The multi-tenancy example used an outdated routing processor style and an invalid `from_context: X-Scope-OrgID` reference. I changed it to use `include_metadata: true` and the current routing connector request-context syntax.
- The transform processor snippets used outdated/unqualified OTTL paths such as `cache`, `body`, `severity_text`, `trace_id.string`, and `time_unix_nano`. I updated them to current log-context paths such as `log.cache`, `log.body`, `log.severity_text`, `log.trace_id.string`, and `log.time_unix_nano`.
- The filtering example used the older `logs.exclude` and `logs.include` configuration shape. I updated it to current `log_conditions` syntax.
- The probabilistic sampler example used an unsupported nested `filter` block. I replaced it with a sampling-priority transform and `sampling_priority` configuration.
- The high-volume HTTP tuning example used `max_recv_msg_size` and `compression`, which are not HTTP server settings. I replaced them with `max_request_body_size` and `compression_algorithms`.
- The label-based routing example used the old routing processor configuration. I updated it to the current routing connector pipeline layout.
- The monitoring example referenced undefined components. I added the missing Loki receiver, Prometheus receiver, batch processor, and OTLP HTTP exporter definitions, and referenced the correct Prometheus receiver instance.
- Troubleshooting guidance referenced the removed `resource_attributes` receiver configuration. I updated it to point readers at the transform processor mapping rules.
- Promtail reached end-of-life on March 2, 2026. I added caveats that Promtail examples are intended for existing deployments and migrations, and that maintained Loki-compatible shippers such as Grafana Alloy should be used for new deployments.

## Review Notes
The Loki receiver is currently listed as an alpha logs receiver in OpenTelemetry Collector Contrib. The article now calls out the Contrib distribution, but future readers should still confirm the component status and exact configuration options for their Collector version.
