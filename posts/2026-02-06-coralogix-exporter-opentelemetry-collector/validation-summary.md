# Validation Summary: How to Configure the Coralogix Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Coralogix exporter
- Routing connector
- Filter, transform, resource, attributes, batch, k8sattributes, tail sampling, memory limiter, metricstransform, and resourcedetection processors
- File storage and health check extensions
- Collector internal telemetry
- Kubernetes observability metadata

## Sources Consulted
- OpenTelemetry Collector Coralogix exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/coralogixexporter/README.md
- Coralogix domain documentation: https://coralogix.com/docs/user-guides/account-management/account-settings/coralogix-domain/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporterhelper persistent queue documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector file storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metricstransform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Issues Found
- The basic and regional domain examples used older or ambiguous Coralogix domains such as `coralogix.us`, `coralogix.in`, and `coralogixsg.com`. Updated the examples to current Coralogix account domains such as `eu1.coralogix.com`, `us1.coralogix.com`, `ap1.coralogix.com`, and `ap2.coralogix.com`.
- The production and troubleshooting telemetry snippets used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current Prometheus `readers` configuration using `host` and `port`.
- The multi-environment example used the old routing processor-style `from_attribute`, `default_exporters`, and `exporters` table fields. Reworked it to use the current routing connector with `default_pipelines`, OTTL `condition` entries, and routed output pipelines.
- The severity mapping example mapped OpenTelemetry TRACE values to `Debug` and DEBUG values to `Verbose`. Updated the mappings to the OpenTelemetry severity range names `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, and `FATAL`.
- The metric filter example used deprecated legacy filter processor syntax with `metrics.exclude.match_type` and `metric_names`. Replaced it with current OTTL-based `metric_conditions`.
- The persistent queue example used `sending_queue.persistent_storage`, but the current exporterhelper field is `sending_queue.storage`. Updated the field.
- The persistent queue explanation said it ensures no data loss. Revised it to say it helps reduce data loss and is subject to disk capacity and retry limits.

## Review Notes
No Collector binary was available in the workspace, so validation was performed against official documentation rather than by running `otelcol validate`. Some snippets are partial examples and assume the referenced components, such as `otlp` receivers, are included in the surrounding Collector configuration.
