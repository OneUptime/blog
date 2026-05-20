# Validation Summary: How to Deploy TiDB with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- TiDB
- TiDB Operator for Kubernetes
- Kubernetes custom resources
- Argo CD Applications, sync waves, sync options, and custom health checks
- Helm chart deployment
- Prometheus and Grafana monitoring
- TiDB backup scheduling to S3-compatible storage

## Sources Consulted
- TiDB Operator deployment documentation: https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-tidb-operator/
- TiDB Operator prerequisites: https://docs.pingcap.com/tidb-in-kubernetes/stable/prerequisites/
- TiDB Operator overview and TiDB version compatibility: https://docs.pingcap.com/tidb-in-kubernetes/stable/tidb-operator-overview/
- TiDB Operator v1.6 notes: https://docs.pingcap.com/tidb-in-kubernetes/stable/whats-new-in-v1.6/
- TiDB monitoring with TidbMonitor: https://docs.pingcap.com/tidb-in-kubernetes/stable/monitor-a-tidb-cluster/
- TiDB backup and restore custom resources: https://docs.pingcap.com/tidb-in-kubernetes/stable/backup-restore-cr
- TiDB Operator v1.6.0 CRD manifest and examples: https://github.com/pingcap/tidb-operator/tree/v1.6.0
- Argo CD sync waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Application sync retries: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD custom resource health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- TiDB v8.1 configuration reference for slow log settings: https://docs.pingcap.com/tidb/stable/tidb-configuration-file
- TiKV configuration reference for block cache settings: https://docs.pingcap.com/tidb/stable/tikv-configuration-file

## Issues Found
- The CRD deployment example used the `tidb-operator` Helm chart with `operatorMode: "crd-only"`. The v1.6.0 chart values do not define this mode, and the chart templates do not include the TiDB Operator CRDs. Changed the example to deploy a checked-in copy of the official `manifests/crd.yaml` through a Git source path.
- The CRD Argo CD sync options included both `ServerSideApply=true` and `Replace=true`. `Replace=true` would make Argo CD use replace/create behavior instead of server-side apply, which contradicted the text. Removed `Replace=true`.
- The operator Helm values included a `scheduler` block, but TiDB Operator v1.6 does not recommend deploying `tidb-scheduler`, and the chart defaults `scheduler.create` to `false`. Removed the scheduler values from the operator example.
- The TiDB v8.1 cluster config used the pre-v6.1 slow log key `log.slow-threshold`. Changed it to `instance.tidb_slow_log_threshold`, which is the current TiDB configuration key.
- The `TidbMonitor` example placed `storage` and `storageClassName` under `prometheus`, but these persistence settings are top-level `TidbMonitor.spec` fields and require `persistent: true`. Moved them to the correct level.
- The `TidbMonitor` example nested Prometheus and Grafana CPU/memory settings under `resources`, but the v1.6 CRD uses direct `requests` and `limits` fields for those components. Moved the resource requests and limits to the correct fields.
- The `TidbMonitor` example omitted required `initializer` and `reloader` sections from the v1.6 CRD schema. Added the required helper image settings and included the Prometheus config reloader used in the official examples.

## Review Notes
- The backup example is schema-valid for the TiDB Operator v1.6 `BackupSchedule` CRD. In a real AWS deployment, credentials still need to be provided through an S3 secret, IAM role, or another supported authentication mechanism.
- The example uses placeholder storage classes and repository paths; these must match the reader's Kubernetes cluster and Git repository layout.
