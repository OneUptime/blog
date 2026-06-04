# Validation Summary: How to Configure Prometheus Retention Policies for Local Storage Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus local TSDB storage
- Prometheus retention policies
- Prometheus Operator and kube-prometheus-stack
- Kubernetes persistent storage
- PromQL alerting rules
- Prometheus remote write
- Thanos-style block upload considerations

## Sources Consulted
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus HTTP API TSDB admin APIs: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-admin-apis
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The storage overview described persisted data as "2-hour chunks." Prometheus documentation describes ingested samples as grouped into two-hour blocks, so I changed this to "2-hour blocks."
- The kube-prometheus-stack values example said retention defaults to 15 days. Prometheus itself defaults to 15 days when no retention option is set, but the current kube-prometheus-stack chart default is 10 days. I updated the comment to distinguish the Prometheus default from the chart default.
- The WAL configuration example used `additionalArgs` as a list of raw command-line strings and duplicated retention/WAL flags that the Prometheus Operator manages through dedicated fields. The Operator expects `additionalArgs` entries as `name`/`value` objects and rejects conflicting managed arguments, so I replaced those entries with the supported `walCompression`, `retention`, and `retentionSize` fields.
- The compaction example used `--storage.tsdb.min-block-duration` and `--storage.tsdb.max-block-duration` through `additionalArgs`. These flags are not present in the current Prometheus command-line documentation, and `additionalArgs` was in the wrong shape. I simplified the example to the supported `disableCompaction` field.
- The snapshot command omitted the requirement that the Prometheus TSDB admin API be enabled. I added the kube-prometheus-stack `enableAdminAPI` requirement to the backup text.
- The restore example attempted to copy data into a Prometheus pod after scaling the StatefulSet to zero. I changed the command to use a temporary recovery pod mounted to the same PVC.
- The emergency cleanup example removed block directories from a running Prometheus pod and then reloaded configuration. Prometheus documentation treats direct block removal as a last-resort storage repair action. I changed the example to stop Prometheus first, perform the removal through a recovery pod, and then restart Prometheus.

## Review Notes
- The storage sizing formula is a rough estimate and intentionally omits some real-world variables such as churn, WAL/checkpoint peaks, and filesystem overhead. The post already accounts for this with overhead guidance.
- The recovery pod in the backup and cleanup examples is assumed to be a temporary pod that mounts the Prometheus PVC. A future improvement could include a full manifest for that pod.
