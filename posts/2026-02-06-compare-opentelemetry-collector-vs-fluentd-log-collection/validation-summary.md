# Validation Summary: How to Compare OpenTelemetry Collector vs Fluentd for Log Collection

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib receivers, processors, exporters, and extensions
- Fluentd
- Fluentd input, filter, output, parser, and buffer plugins
- Elasticsearch log export
- Kubernetes log metadata enrichment

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receiver components list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processor components list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Contrib fluent_forward receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/fluentforwardreceiver/README.md
- OpenTelemetry Collector exporterhelper persistent queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- Fluentd tail input documentation: https://docs.fluentd.org/input/tail
- Fluentd record_transformer filter documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd buffer section documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd Elasticsearch output documentation: https://docs.fluentd.org/output/elasticsearch
- Fluentd plugin directory: https://www.fluentd.org/plugins/all/

## Issues Found
- The Fluentd `record_transformer` example used a Ruby ternary expression inside `${...}` without enabling Ruby evaluation. Added `enable_ruby true`, because Fluentd requires this option for full Ruby syntax in `record_transformer` placeholders.
- The OpenTelemetry transform processor example used unprefixed `attributes[...]` paths inside a log context. Updated the statements to use `log.attributes[...]` and `set(...) where ... != nil`, matching the documented transform processor path style for log statements.
- The OpenTelemetry persistent queue example configured `file_storage` but did not enable it under `service.extensions`. Added `service: extensions: [file_storage]`, because configured Collector extensions must be enabled in the service section.
- The migration example used `fluentforward`, which is now a deprecated alias. Updated it to `fluent_forward`, the current receiver name documented by OpenTelemetry Collector Contrib.
- The comparison table described a generic "Container log receiver" for OpenTelemetry Collector. Updated it to "Filelog receiver with container log parsing", because the official receiver list does not include a standalone container log receiver for logs.
- The performance section included precise memory usage ranges for 10,000 logs per second without a versioned benchmark or workload definition. Replaced those hard numbers with a configuration-dependent statement to avoid presenting unverifiable figures as general facts.

## Review Notes
The post is technically relevant and the remaining examples are representative configuration snippets rather than complete production configurations. Teams using the OpenTelemetry Collector should still validate component availability against the specific Collector distribution they deploy, because many log-related components are in the contrib or Kubernetes distributions rather than the core distribution.
