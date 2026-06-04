# Validation Summary: How to Set Up Elasticsearch Monitoring with Metricbeat on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes monitoring guide

## Technologies Covered
- Elasticsearch
- Metricbeat
- Kubernetes
- Kibana
- Elasticsearch Watcher
- Elasticsearch index lifecycle management

## Sources Consulted
- Elastic Metricbeat Elasticsearch module documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-elasticsearch
- Elastic Metricbeat Kubernetes deployment documentation: https://www.elastic.co/docs/reference/beats/metricbeat/running-on-kubernetes
- Elastic Metricbeat Kubernetes module documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-kubernetes
- Elastic Metricbeat System module documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-system
- Elastic Metricbeat Elasticsearch output documentation: https://www.elastic.co/docs/reference/beats/metricbeat/elasticsearch-output
- Elastic Metricbeat ILM documentation: https://www.elastic.co/docs/reference/beats/metricbeat/ilm
- Elastic Metricbeat command reference: https://www.elastic.co/docs/reference/beats/metricbeat/command-line-options
- Elastic Metricbeat dashboard loading documentation: https://www.elastic.co/docs/reference/beats/metricbeat/configuration-dashboards
- Elastic Metricbeat exported Elasticsearch fields: https://www.elastic.co/docs/reference/beats/metricbeat/exported-fields-elasticsearch
- Elastic Metricbeat Docker image documentation: https://www.elastic.co/docs/reference/beats/metricbeat/running-on-docker

## Issues Found
- The Kubernetes module example used the Kubernetes API server host for `node`, `pod`, `container`, and `volume` metricsets. Those metricsets require the kubelet endpoint, so the config now uses `https://${NODE_NAME}:10250`, sets `host: ${NODE_NAME}`, and uses token authentication with TLS verification disabled for the example.
- The RBAC example was missing `nodes/stats`, which Metricbeat commonly needs for Kubernetes node stats collection. Added that resource.
- The DaemonSet used the deprecated `-system.hostfs=/hostfs` CLI flag. Moved host filesystem configuration to the System module with `hostfs: "/hostfs"` and removed the deprecated flag from container args.
- The Metricbeat image tag was outdated for a 2026 post. Updated the example from `8.11.0` to `9.4.1`.
- The Elasticsearch module enabled `xpack.enabled: true` while the rest of the post queried `metricbeat-*` event indices. Elastic documents that Stack Monitoring mode sends to monitoring indices, so the examples now use `xpack.enabled: false`.
- The initial ConfigMap did not collect `cluster_stats`, but a later Watcher alert queried `elasticsearch.cluster.stats.status`. Added `cluster_stats` and `pending_tasks` to the deployable Elasticsearch metricsets.
- The output used custom `indices` while also enabling ILM. Elastic documents that custom `indices` disable ILM, so the custom index routing was removed and the examples use `metricbeat-*`.
- The heap alert compared `elasticsearch.node.stats.jvm.mem.heap.used.pct` to `85`, but Metricbeat percent fields are stored as fractions. Changed the threshold to `0.85`.
- The unassigned shard alert matched only `yellow` cluster status and would miss `red` status. Changed it to match both `yellow` and `red`.
- The multi-cluster example used unsupported `cluster_uuid` fields in Elasticsearch module configs. Replaced them with `scope: cluster` and custom `fields.cluster_alias` values.
- The performance tuning example used invalid `shard.enabled: false` configuration. Removed it and clarified that users should only enable needed metricsets.
- The text claimed shard metrics reveal replication lag. Adjusted this to shard allocation and state, which matches the exported fields.
- The text made an overly broad claim about all large clusters generating only megabytes of monitoring data per day. Reworded it to depend on cluster size, metricsets, and collection period.

## Review Notes
The tutorial remains a concise Metricbeat-based approach. In production, consider separating cluster-level Elasticsearch collection from per-node Kubernetes/system collection to avoid duplicate Elasticsearch module events when many DaemonSet pods point at the same Elasticsearch service.
