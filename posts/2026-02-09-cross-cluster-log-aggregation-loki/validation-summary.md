# Validation Summary: How to Set Up Cross-Cluster Log Aggregation with Loki and Promtail

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- Promtail
- Kubernetes
- LogQL
- Prometheus alert rules
- cert-manager
- Amazon S3 / AWS CLI

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki label cardinality guidance: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Promtail pipeline stages reference: https://grafana.com/docs/loki/latest/send-data/promtail/stages/
- Grafana Loki 3.7 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-7/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- Promtail is end-of-life as of March 2, 2026. Added a note that the guide is appropriate for existing Promtail deployments and that new deployments should use Grafana Alloy or another supported Loki client.
- Loki retention used deprecated table-manager-oriented settings and omitted current compactor retention settings. Replaced the retention configuration with `limits_config.retention_period`, `limits_config.max_query_lookback`, and compactor retention settings including `retention_enabled` and `delete_request_store`.
- The Loki memberlist configuration referenced `loki-gossip-ring` without defining a matching service. Added a headless Kubernetes Service for the gossip ring.
- Promtail client batching options were written as `batch_wait` and `batch_size`, but Promtail uses `batchwait` and `batchsize`. Corrected both examples.
- The Promtail Kubernetes scrape config did not set `__path__`, so it would discover pods but not read container log files. Added the required relabeling to point Promtail at `/var/log/pods/.../*.log`.
- The Promtail DaemonSet referenced a `promtail` service account without defining service discovery RBAC. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources.
- The label cardinality example attempted to promote `workload_short` using the labels stage in the wrong direction. Corrected the labels mapping so the shortened value becomes the `workload` label.
- The runtime per-tenant overrides example used `per_tenant_override_config`, which is not the current configuration shape. Replaced it with `runtime_config.file` and kept the overrides file content.
- The alert for missing cluster logs used invalid LogQL syntax with `absent_over_time(count by (...) ...[10m])`. Replaced it with a valid `sum by (cluster) (count_over_time(...[10m])) == 0` expression.
- The network optimization snippet set `Content-Encoding: gzip` manually in Promtail. Promtail sends Loki push payloads as compressed protobuf by default, and setting that header manually would not gzip the body. Replaced it with batch tuning.
- The disaster recovery CronJob attempted to back up a local index path from an unspecified PVC. Replaced it with an S3-to-S3 object store backup example.

## Review Notes
The guide remains Promtail-focused because that is the post topic, but Promtail is no longer supported for new deployments. A future rewrite should migrate the collection examples to Grafana Alloy while preserving the same Loki label strategy and multi-cluster architecture.
