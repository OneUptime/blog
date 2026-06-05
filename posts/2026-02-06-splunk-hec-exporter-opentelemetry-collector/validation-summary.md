# Validation Summary: How to Configure the Splunk HEC Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Splunk HEC exporter
- Splunk HTTP Event Collector
- Splunk Enterprise and Splunk Cloud Platform
- Collector processors, connectors, extensions, and internal telemetry
- Kubernetes metadata enrichment

## Sources Consulted
- OpenTelemetry Collector Contrib Splunk HEC exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/splunkhecexporter
- OpenTelemetry Collector Contrib Splunk HEC exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/splunkhecexporter/config.go
- OpenTelemetry Collector exporter helper documentation for retry, sending queue, and persistent queue settings: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry routing processor deprecation and routing connector migration docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/routingprocessor and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transform and attributes processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/ and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- OpenTelemetry Collector Contrib file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Collector Contrib Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- Splunk HEC exporter component documentation: https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/splunk-hec-exporter
- Splunk HTTP Event Collector documentation: https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector

## Issues Found
- The post described HEC as replacing traditional inputs. Changed this to say HEC complements traditional inputs and forwarders.
- The post said HEC supports only raw and event endpoints and that the exporter uses the event endpoint. Updated this to describe structured, raw, health, and acknowledgment endpoints, and clarified the exporter normally sends structured HEC events to `/services/collector`.
- The production and Splunk Cloud examples used an unsupported nested `health_check` exporter block. Replaced it with `health_check_enabled: true` and `health_path: /services/collector/health`.
- The health-check explanation said checks are periodic. Updated it to match the exporter behavior: startup HEC health verification.
- The multi-index example used the deprecated routing processor. Replaced it with the current routing connector pattern and routed to pipelines instead of exporters.
- The traces example tried to copy `trace_id`, `span_id`, and `parent_span_id` using the attributes processor, but those are span fields rather than attributes. Replaced it with the transform processor and OTTL statements.
- The persistent queue example used the old `persistent_storage` key. Replaced it with `sending_queue.storage` and added `create_directory: true` for the file storage extension.
- The service telemetry examples used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with a Prometheus pull reader configuration.
- The Kubernetes attributes example requested `k8s.cluster.name`, which is not an extractable metadata key for the k8sattributes processor. Replaced it with `k8s.cluster.uid`.
- The metrics and traces examples used nonstandard source type names. Updated them to use the documented OpenTelemetry-style `otel` sourcetype.

## Review Notes
Validated representative corrected configurations with `otel/opentelemetry-collector-contrib:latest` (`otelcol-contrib` 0.153.0) using the Collector `validate` command. The post still uses placeholder endpoints, tokens, certificate paths, and Splunk index names, which readers must replace for their environments.
