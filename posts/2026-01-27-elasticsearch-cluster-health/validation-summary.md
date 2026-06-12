# Validation Summary: How to Monitor Elasticsearch Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Cluster Health API
- Elasticsearch CAT APIs
- Elasticsearch Nodes Stats API
- Elasticsearch Cluster Allocation Explain API
- Elasticsearch Cluster Reroute API
- JVM, disk, shard, segment, and thread pool monitoring
- Bash, curl, jq
- Python 3 standard library
- OneUptime webhooks

## Sources Consulted
- Elasticsearch Cluster Health API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Elasticsearch Cluster Allocation Explain API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elasticsearch Nodes Stats API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats
- Elasticsearch CAT Nodes API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes
- Elasticsearch CAT Indices API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices
- Elasticsearch CAT Shards API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards
- Elasticsearch CAT Thread Pool API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-thread-pool
- Elasticsearch CAT Allocation API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation
- Elasticsearch Cluster Reroute API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Elasticsearch thread pool settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/thread-pool-settings
- Elasticsearch shard sizing guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards
- Elasticsearch Force Merge API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge
- Python standard library documentation for argparse, json, urllib.request, urllib.error, datetime, typing, and sys: https://docs.python.org/3/library/

## Issues Found
- The post referenced "split-brain scenarios" as a current availability risk. Updated the wording to "quorum loss or master instability" to align better with modern Elasticsearch coordination behavior.
- The thread pool examples referenced `.thread_pool.bulk.rejected`. Current Elasticsearch documentation describes `write` and newer `write_coordination` pools for write and bulk coordination work, not a `bulk` pool. Updated the jq and Python examples to use `write_coordination` with null-safe defaults.
- The warning script treated thread pool rejection counters as point-in-time values. Elasticsearch exposes rejection counters as cumulative node stats, so the post now notes that production alerting should compare against prior samples.
- The segment-health section said high segment counts indicate a need for force merge. Elasticsearch recommends force merging only read-only indices, so the comment now limits force merge candidacy to read-only indices.
- The comprehensive Python script comments said it checked yellow status duration and fetched allocation explanations for each unassigned shard, but the code did not implement either behavior. Updated those comments to match what the script actually does.
- The capacity-planning summary recommended "20-40 shards per GB of heap", which is outdated guidance. Replaced it with current guidance to size shards for the workload, target roughly 10-50GB per shard where practical, and stay below cluster shard limits.
- The alerting threshold table treated any thread pool rejection as a warning. Updated it to focus on new or increasing rejections, with sustained increases as critical.

## Review Notes
The post remains version-neutral. Several examples use CAT APIs, which Elasticsearch documents as intended for human consumption rather than application consumption; the post also uses Nodes Stats API for scripted monitoring, which is appropriate. Production deployments may also require HTTPS, authentication, API keys, and TLS options that are intentionally omitted from the localhost examples.
