# Validation Summary: How to Configure the Elasticsearch Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Elasticsearch receiver
- Elasticsearch REST APIs and security privileges
- OTLP HTTP exporter
- Collector processors: memory_limiter, resource, batch
- TLS configuration for Collector HTTP clients

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/README.md
- OpenTelemetry Collector Contrib Elasticsearch receiver config.go: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/config.go
- OpenTelemetry Collector Contrib Elasticsearch receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/documentation.md
- OpenTelemetry Collector HTTP configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector TLS configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- Elasticsearch security privileges documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-privileges.html
- Elasticsearch create or update roles API: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-put-role.html
- Elasticsearch create or update users API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user

## Issues Found
- The basic configuration used a top-level `skip_verify` field, which is not a valid Elasticsearch receiver setting. Removed it; TLS verification settings belong under `tls.insecure_skip_verify` when TLS is configured.
- The post said `indices: []` means all indices. The receiver documentation says the default is `["_all"]`, and an explicit empty list disables index-level metrics. Updated comments and the index filtering section accordingly.
- The production pipeline listed processors as `[memory_limiter, batch, resource]`. Updated it to `[memory_limiter, resource, batch]` so the memory limiter remains first and batching happens after resource enrichment.
- Several metric names in the critical metrics section did not match metrics emitted by the receiver. Replaced them with documented metric names such as `elasticsearch.os.cpu.usage`, `jvm.memory.heap.used`, `elasticsearch.node.fs.disk.available`, `elasticsearch.node.operations.completed`, `jvm.gc.collections.elapsed`, and `elasticsearch.breaker.tripped`.
- The troubleshooting section referenced `cluster:monitor/*` privileges. Updated it to the documented `monitor` or `manage` cluster privilege requirement.
- The least-privilege curl example assigned the built-in `monitoring_user` role directly. Replaced it with explicit creation of an `otel-monitor` role using `cluster: ["monitor"]` and index `monitor` privileges, then assigned that role to the collector user.

## Review Notes
The receiver is a contrib Collector component with beta stability for metrics. Some emitted metrics are marked development stability in the receiver's generated metric documentation, so metric availability and names should be rechecked when upgrading Collector versions.
