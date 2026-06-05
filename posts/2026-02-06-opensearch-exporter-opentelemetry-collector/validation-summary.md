# Validation Summary: How to Configure the OpenSearch Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib OpenSearch exporter
- OpenSearch
- OpenSearch Bulk API
- Collector authentication extensions
- Basic authentication
- AWS Signature Version 4 authentication
- Collector processors: batch, attributes, resource detection, transform

## Sources Consulted
- OpenTelemetry Collector contrib OpenSearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/opensearchexporter/README.md
- OpenTelemetry Collector contrib OpenSearch exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/opensearchexporter/config.go
- OpenTelemetry Collector contrib OpenSearch exporter factory source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/opensearchexporter/factory.go
- OpenTelemetry Collector HTTP client configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector exporter helper configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector basic auth extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/basicauthextension/README.md
- OpenTelemetry Collector SigV4 auth extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/sigv4authextension/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post claimed the OpenSearch exporter supports traces, metrics, and logs. The current exporter factory registers traces and logs only, and the README lists alpha support for traces and logs. I removed the metrics pipeline and `metrics_index` examples and changed the surrounding claims to traces and logs.
- The advanced authentication example used unsupported OpenSearch exporter fields: `http.endpoints`, top-level `auth.user/password`, `bulk.max_batch_size`, `bulk.max_batch_bytes`, `bulk.flush_interval`, `discover_nodes_interval`, and `discover_nodes_on_start`. I replaced them with supported HTTP client auth, `basicauth/client`, `bulk_action`, retry, and mapping fields.
- The index time format used Go layout syntax inside `traces_index` and `logs_index`. The exporter uses separate `traces_index_time_format` and `logs_index_time_format` fields with tokens such as `yyyy.MM.dd`, so I corrected the example and explanation.
- The AWS example used an unsupported `aws` block under the exporter. I moved AWS region, service, and role assumption settings to the `sigv4auth` extension and kept the exporter wired through `http.auth.authenticator`.
- The index template section showed an unsupported `index_template` exporter block. I corrected the text to state that templates must be managed in OpenSearch, not by this exporter, and replaced the snippet with supported exporter mapping configuration.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. I changed it to the supported Prometheus `readers` configuration.
- The performance example used unsupported `bulk` batching fields. I replaced them with supported `sending_queue.batch` settings.
- The troubleshooting note said to increase flush intervals to reduce memory usage. I changed it to decrease flush intervals.

## Review Notes
The OpenSearch exporter is currently alpha for traces and logs. ECS and flattening mapping modes have instability caveats in the official exporter documentation, so the examples now use the default `ss4o` mapping mode.
