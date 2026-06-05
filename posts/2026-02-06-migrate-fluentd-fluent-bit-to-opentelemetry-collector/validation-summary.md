# Validation Summary: How to Migrate from Fluentd or Fluent Bit to OpenTelemetry Collector

## Status
validated

## Post Type
Migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- OpenTelemetry Collector Contrib Kubernetes attributes processor
- OpenTelemetry Collector Contrib Elasticsearch exporter
- OpenTelemetry Collector filter and transform processors
- Fluentd
- Fluent Bit
- Kubernetes log collection
- Elasticsearch log export

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry container log parser announcement and example: https://opentelemetry.io/blog/2024/otel-collector-container-log-parser/
- OpenTelemetry Collector Contrib Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector Contrib Elasticsearch exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector exporterhelper queue and retry documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL log context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md

## Issues Found
- The Kubernetes filelog example manually parsed CRI logs with a regex and did not configure pod association for `k8sattributes`. Updated it to use the documented `container` operator and added `pod_association` rules based on Kubernetes resource attributes extracted from file paths.
- The Kubernetes example defined `file_storage` but did not show it being enabled as a service extension. Added `service.extensions: [file_storage]`.
- The Elasticsearch exporter example used `retry_on_failure`, but the current Elasticsearch exporter documents its retry settings under `retry`. Updated the example to use `retry`.
- The Elasticsearch example compared to Fluentd file buffering but only configured an in-memory queue. Added `sending_queue.storage: file_storage` and the corresponding storage extension.
- The filter processor example used older `logs.log_record` syntax. Updated it to the current documented `log_conditions` syntax and `log.body.string` path.
- The transform processor example used unqualified log paths. Updated it to current documented OTTL paths, `log.attributes`.
- The buffering gotcha implied that enabling `file_storage` alone makes queues persistent. Clarified that exporter queue persistence requires referencing the storage extension from `sending_queue.storage`.

## Review Notes
The snippets are still partial Collector configuration fragments. A complete Collector configuration also needs service pipelines with the relevant receivers, processors, and exporters wired together.
