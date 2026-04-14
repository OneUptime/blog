# Validation Summary: How to Configure Jobs Persistence with Dapr Scheduler

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Scheduler service
- Dapr Jobs API (alpha)
- Embedded etcd (Dapr Scheduler persistence layer)
- Kubernetes StatefulSets and Persistent Volume Claims
- Helm (Dapr Helm chart configuration)

## Sources Consulted
- Dapr Jobs API reference (https://docs.dapr.io/reference/api/jobs_api/)
- Dapr Scheduler Helm chart values.yaml (https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/values.yaml)
- Dapr Scheduler StatefulSet template (https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_statefulset.yaml)
- Dapr Helm chart README (https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)
- Dapr Scheduler documentation (https://docs.dapr.io/concepts/dapr-services/scheduler/)

## Issues Found

1. **Invalid Helm value `dapr_scheduler.replicaCount`**: The blog post used `--set dapr_scheduler.replicaCount=3` in the Helm command and `replicaCount: 3` in the values.yaml example. However, the Scheduler replica count is hardcoded to 3 in the StatefulSet template and is not configurable via Helm. The Dapr docs state that scaling Scheduler replicas up or down is not possible without incurring data loss. **Fix:** Removed `replicaCount` from Helm command and values.yaml, and updated the description to note that the Scheduler always runs with 3 replicas in Kubernetes.

2. **Incorrect Kubernetes pod label**: The `kubectl logs` command used `-l app=dapr-scheduler`, but the actual label set on Scheduler pods is `app=dapr-scheduler-server` (matching the StatefulSet name). **Fix:** Changed to `-l app=dapr-scheduler-server`.

3. **Protobuf `Any` JSON encoding in HTTP API payload**: The job creation curl example used `"@type": "type.googleapis.com/google.protobuf.StringValue"` wrapping in the `data` field. While this is technically valid (the underlying gRPC API uses `google.protobuf.Any`), the official Dapr HTTP API documentation shows a simpler JSON object format for the `data` field without the protobuf `@type` discriminator. **Fix:** Simplified the `data` field to a plain JSON object to match official HTTP API documentation style.

## Review Notes
- The Jobs API is still at `v1.0-alpha1` and has not graduated to stable. This is correctly reflected in the post's API paths, but readers should be aware the API may change before reaching stable.
- The post correctly identifies that the Scheduler uses an embedded etcd cluster by default, but does not mention the option to use an external etcd instance (via `etcdEmbed: false`). This is not an error but could be a useful addition in the future.
