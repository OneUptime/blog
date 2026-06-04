# Validation Summary: How to configure Kibana dashboards for Kubernetes cluster monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kibana dashboards
- Kibana data views
- Kibana Query Language (KQL)
- Elasticsearch aggregations
- Kubernetes log monitoring
- EFK stack concepts

## Sources Consulted
- Elastic documentation: Data views - https://www.elastic.co/guide/en/kibana/master/data-views.html
- Elastic documentation: Kibana Query Language - https://www.elastic.co/docs/reference/query-languages/kql
- Elastic documentation: Date histogram aggregation - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-datehistogram-aggregation.html
- Elastic documentation: Auto-interval date histogram aggregation - https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-autodatehistogram-aggregation
- Elastic documentation: Terms aggregation - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html
- Elastic documentation: Percentiles aggregation - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-percentile-aggregation.html
- Elastic documentation: Save a search for reuse - https://www.elastic.co/guide/en/kibana/current/save-open-search.html
- Elastic documentation: Dashboard drilldowns - https://www.elastic.co/guide/en/kibana/current/drilldowns.html
- Kubernetes documentation: Pod lifecycle and container states - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The post used older Kibana "Index Patterns" terminology and navigation. Elastic documentation now uses "Data Views" for the same Kibana concept, with index patterns referenced as the former name. Updated the section title and navigation path to use "Stack Management -> Data Views -> Create data view" while preserving the legacy term for reader context.
- The saved search examples used leading wildcards, such as `*CrashLoopBackOff*` and `*authentication*`. Elastic's KQL documentation notes that leading wildcards are disabled by default for performance unless `query:allowLeadingWildcards` is changed. Rewrote the examples to avoid leading wildcards.
- The field existence syntax was tightened from `kubernetes.container_name:*` to `kubernetes.container_name: *`, matching Elastic's documented KQL examples.

## Review Notes
- The Kubernetes field names shown, such as `kubernetes.namespace_name` and `kubernetes.pod_name`, are common in some Fluentd/EFK pipelines but may differ from Elastic Agent or ECS-style mappings, which often use fields like `kubernetes.namespace` and `kubernetes.pod.name`. The post remains accurate for pipelines that emit those fields, but readers should adapt dashboard fields to their ingest schema.
- The aggregation guidance for date histograms, terms buckets, and percentiles aligns with Elasticsearch documentation. Percentiles are approximate in Elasticsearch, which may be worth mentioning in a future revision.
