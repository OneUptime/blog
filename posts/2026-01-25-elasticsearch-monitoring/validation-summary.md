# Validation Summary: How to Configure Monitoring in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x APIs
- Prometheus
- Prometheus Elasticsearch Exporter
- Grafana PromQL dashboard queries
- Prometheus alerting rules
- Python Elasticsearch client
- systemd service configuration

## Sources Consulted
- Elasticsearch Cluster Health API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cluster-health
- Elasticsearch Nodes Stats API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats
- Elasticsearch Index Stats API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-stats
- Elasticsearch CAT Indices API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices
- Python Elasticsearch client cluster API documentation: https://elasticsearch-py.readthedocs.io/en/v8.15.1/api/cluster.html
- Python Elasticsearch client nodes API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/nodes.html
- Prometheus Community Elasticsearch Exporter README and flags: https://github.com/prometheus-community/elasticsearch_exporter
- Prometheus Community Elasticsearch Exporter metrics list: https://github.com/prometheus-community/elasticsearch_exporter/blob/master/metrics.md
- Prometheus Community Elasticsearch Exporter latest release metadata: https://api.github.com/repos/prometheus-community/elasticsearch_exporter/releases/latest

## Issues Found
- The exporter download example pinned `v1.6.0`, while the upstream latest release is `v1.10.0`. Updated the download URL, archive name, and directory name to `v1.10.0`.
- The exporter example said "Run with authentication" but used `--es.uri=https://localhost:9200` without credentials. Updated the URI to include the documented basic-auth URI format.
- The exporter flags `--es.snapshots` and `--es.cluster_settings` are replaced by `--collector.snapshots` and `--collector.clustersettings` in current exporter versions. Updated both flags.
- The PromQL example used `elasticsearch_cluster_health_active_shards_percent`, which is not listed in the current exporter metrics. Replaced it with a calculation based on `elasticsearch_cluster_health_active_shards` and `elasticsearch_cluster_health_unassigned_shards`.
- The JVM heap percentage dashboard and alert expressions filtered `elasticsearch_jvm_memory_max_bytes` with `area="heap"`, but the exporter documents `area` on `elasticsearch_jvm_memory_used_bytes`, not on the max metric. Removed the label filter from the denominator.
- The PromQL search latency example used `elasticsearch_indices_search_query_time_seconds_total`, but the current exporter exposes `elasticsearch_indices_search_query_time_seconds`. Updated the query.
- The Python monitoring service used `cat.indices()` as structured application data. Elastic documents CAT APIs as human-oriented inspection APIs, so the example now uses `cluster.health()`, `indices.stats()`, and `indices.get_settings()` for index health data.
- The Python callback annotation used the built-in `callable` instead of a proper typing annotation. Updated it to `Optional[Callable[[List[str]], None]]`.
- Removed the now-unused size parser after replacing CAT output parsing with byte values from the Index Stats API.

## Review Notes
- The remaining CAT API examples are appropriate for quick command-line inspection, not application code.
- The Prometheus scrape interval of 15 seconds can add load when `--es.all` and `--es.indices` are enabled; the exporter documentation recommends measuring scrape duration for the target cluster.
- The extracted Python example was checked with `python3 -m py_compile` after edits.
