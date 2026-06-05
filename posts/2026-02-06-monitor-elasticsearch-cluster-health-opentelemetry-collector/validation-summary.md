# Validation Summary: How to Monitor Elasticsearch Cluster Health with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Elasticsearch receiver
- Elasticsearch cluster health, node stats, and index stats APIs
- Prometheus-style alerting rules
- JVM metrics

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch receiver README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/elasticsearchreceiver
- OpenTelemetry Collector Contrib Elasticsearch receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/elasticsearchreceiver/metadata.yaml
- OpenTelemetry Collector Contrib Elasticsearch receiver generated metric documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/elasticsearchreceiver/documentation.md
- Elasticsearch cluster health API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Elastic red/yellow cluster health troubleshooting documentation: https://www.elastic.co/docs/troubleshoot/elasticsearch/red-yellow-cluster-status
- Elastic disk watermark troubleshooting documentation: https://www.elastic.co/docs/troubleshoot/elasticsearch/fix-watermark-errors
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The collector configuration used `http://` while also configuring TLS CA verification. Changed the endpoint to `https://elasticsearch:9200` and updated the TLS comment to describe CA verification instead of skipping TLS verification.
- The post used non-existent Elasticsearch receiver JVM metric names such as `elasticsearch.jvm.memory.heap.used` and `elasticsearch.jvm.gc.collection.time`. Updated them to the actual emitted metrics: `jvm.memory.heap.used`, `jvm.memory.heap.max`, `jvm.gc.collections.count`, and `jvm.gc.collections.elapsed`.
- The post described `elasticsearch.cluster.health` as a numeric 0/1/2 metric. Updated it to describe the actual `status` attribute values: `green`, `yellow`, and `red`.
- The Prometheus alert examples checked `elasticsearch_cluster_health == 1` and `== 2`. Updated them to match on `status="yellow"` and `status="red"`.
- The alert examples used JVM and disk metric names that did not match default OpenTelemetry-to-Prometheus translation. Updated them to use byte and millisecond suffixes where applicable.
- The alert annotations used `node_name`, which does not match the Elasticsearch receiver's node resource attribute name after Prometheus-style label conversion. Updated examples to `elasticsearch_node_name`.
- The post said red cluster health means data loss is possible. Updated this to the more precise Elastic documentation wording that some data is unavailable when a primary shard is unassigned.
- The disk watermark explanation incorrectly stated that Elasticsearch starts relocating at the low watermark and stops allocating entirely at the high watermark. Updated it to say Elasticsearch avoids allocating replicas past the low watermark and relocates shards away past the high watermark.

## Review Notes
The receiver is currently beta for metrics in the contrib distribution and supports Elasticsearch 7.9+. Alert metric names may still need adjustment for backends that preserve OpenTelemetry metric names instead of applying default Prometheus translation.
