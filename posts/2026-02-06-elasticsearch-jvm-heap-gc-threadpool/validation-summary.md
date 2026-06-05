# Validation Summary: How to Monitor Elasticsearch JVM Heap Usage, GC Pause Time,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- OpenTelemetry Collector
- OpenTelemetry Collector Elasticsearch receiver
- JVM heap and garbage collection metrics
- Elasticsearch thread pools

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/README.md
- OpenTelemetry Collector Contrib Elasticsearch receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/documentation.md
- OpenTelemetry Collector Contrib Elasticsearch receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/elasticsearchreceiver/metadata.yaml
- Elasticsearch JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elasticsearch high JVM memory pressure troubleshooting documentation: https://www.elastic.co/docs/troubleshoot/elasticsearch/high-jvm-memory-pressure
- Elasticsearch rejected requests troubleshooting documentation: https://www.elastic.co/docs/troubleshoot/elasticsearch/rejected-requests
- Elasticsearch thread pool settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch nodes stats API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats

## Issues Found
- The post used non-existent OpenTelemetry receiver metric names such as `elasticsearch.node.jvm.memory.heap.used`, `elasticsearch.node.jvm.gc.collections.count`, and related JVM-prefixed node metrics. I changed these to the documented `jvm.memory.*` and `jvm.gc.collections.*` metrics emitted by the Elasticsearch receiver.
- The post listed `elasticsearch.node.thread_pool.tasks.completed` and `elasticsearch.node.thread_pool.tasks.rejected`, but the receiver exposes `elasticsearch.node.thread_pool.tasks.finished` with `state="completed"` or `state="rejected"`. I updated the collector configuration, metric descriptions, examples, and alert condition accordingly.
- The thread pool examples used `pool="search"` and `pool="write"` attributes, but the receiver documents the attribute as `thread_pool_name`. I changed the examples to use `thread_pool_name`.
- The garbage collection examples used `gc="young"` and `gc="old"` attributes. I changed them to the documented `name` attribute for garbage collector name.
- The GC overhead formula divided a per-second rate by a duration, which would not produce a correct percentage from a cumulative millisecond metric. I changed it to use `increase(jvm.gc.collections.elapsed[5m]) / (5 * 60 * 1000) * 100`.
- The average GC pause formula used all-time cumulative values. I changed it to use `increase()` over a five-minute window so it represents recent pause duration.
- The heap-size guidance said never exceed 30.5 GB for compressed oops. Elasticsearch documentation says the exact threshold varies, 26 GB is safe on most systems, and it can be as large as 30 GB on some systems. I updated the wording.
- The recommendation to use "frozen indices" was outdated for modern Elasticsearch because frozen indices were deprecated and replaced by newer frozen tier/searchable snapshot workflows. I changed it to recommend the frozen data tier or searchable snapshots.

## Review Notes
The alert examples are pseudocode rather than a complete rule format for a specific alerting engine. The metric names and attributes are now aligned with the OpenTelemetry Collector Elasticsearch receiver documentation, but users may still need to adapt label/resource names such as the node identifier to their backend.
