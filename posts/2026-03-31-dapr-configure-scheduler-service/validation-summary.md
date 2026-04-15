# Validation Summary: How to Configure Dapr Scheduler Service

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (v1.14+)
- Dapr Scheduler service (control plane component)
- Dapr Jobs API (v1.0-alpha1)
- Kubernetes / Helm
- etcd (embedded in Scheduler)
- Node.js / Express (callback handler example)

## Sources Consulted
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Scheduler concept docs: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart source (values.yaml and StatefulSet template): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr v1.14.0 release notes: https://github.com/dapr/dapr/releases/tag/v1.14.0

## Issues Found

1. **Incorrect Helm value for enabling Scheduler**: The post used `dapr_scheduler.enabled=true` in the helm install command. The Scheduler is enabled by default in Dapr 1.14+ via `global.scheduler.enabled=true`, so the explicit flag was unnecessary and pointed to a non-existent Helm value. Removed the `--set` flags from the install command since defaults are sufficient.

2. **Non-existent `replicaCount` Helm value**: The post set `dapr_scheduler.replicaCount=3`. The Scheduler's replica count is hardcoded to 3 in the StatefulSet template and is not user-configurable via Helm values. Removed this from both the install command and values file.

3. **Incorrect `image.tag` location**: The post placed `image.tag` under `dapr_scheduler`. The image tag is set via `global.tag` in the Dapr Helm chart, not per-subchart. Moved to `global.tag: "1.14.0"`.

4. **Non-existent `extraArgs` Helm value**: The post used `dapr_scheduler.extraArgs` with raw CLI flags. This field does not exist in the Scheduler subchart. Replaced with the proper `cluster.etcdDataDirPath` Helm value for configuring the etcd data directory. Removed `--etcd-initial-cluster-token` (flag does not exist in Dapr Scheduler) and `--initial-cluster` (auto-generated from StatefulSet pod names, not user-configurable).

5. **Incorrect protobuf type annotation in HTTP API request**: The post included `"@type": "type.googleapis.com/google.protobuf.StringValue"` in the `data` field of the Jobs API POST request. The HTTP API accepts plain JSON values for the `data` field; protobuf type annotations are only used at the gRPC layer. Removed the `@type` field.

6. **Incorrect kubectl label selector**: The post used `-l app=dapr-scheduler`. The actual label on Scheduler pods is `app=dapr-scheduler-server` (with the `-server` suffix). Fixed both the `kubectl get pods` and `kubectl logs` commands.

## Review Notes
- The Jobs API endpoint (`v1.0-alpha1`) is still in alpha as of Dapr v1.17. This is correctly reflected in the post but readers should be aware the API may change in future versions.
- The Scheduler always runs as a 3-replica StatefulSet with embedded etcd for HA. This is by design and not configurable, which is worth noting for readers who may want different replica counts.
- The job callback handler example in Node.js/Express is correct in structure and endpoint path format (`/job/<job-name>`).
- The `@every 24h` schedule format is valid. Dapr also supports 6-field cron expressions (with a seconds field) for more precise scheduling.
