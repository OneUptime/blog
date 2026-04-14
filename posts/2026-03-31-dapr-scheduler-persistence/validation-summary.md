# Validation Summary: How to Configure Dapr Scheduler Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Scheduler service (embedded etcd)
- Kubernetes PersistentVolumeClaims and StorageClasses
- Helm chart configuration for Dapr
- Dapr Jobs API (alpha)
- AWS EBS CSI driver

## Sources Consulted
- Dapr documentation: Persisting Scheduler Jobs (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-persisting-scheduler/)
- Dapr documentation: Jobs API Reference (https://docs.dapr.io/reference/api/jobs_api/)
- Dapr documentation: Jobs Overview (https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/)
- Dapr Helm chart source: `charts/dapr/charts/dapr_scheduler/values.yaml` on GitHub (https://github.com/dapr/dapr)
- Kubernetes documentation: Storage Classes (https://kubernetes.io/docs/concepts/storage/storage-classes/)

## Issues Found

1. **Incorrect Helm values key (`volumeclaim` -> `cluster`)**: The blog used `dapr_scheduler.volumeclaim` as the Helm values key. The correct key is `dapr_scheduler.cluster`. Fixed throughout the Helm values YAML and `--set` flags.

2. **Incorrect storage size field (`requestsStorage` -> `storageSize`)**: The blog used `requestsStorage` as the field name. The correct Helm value is `storageSize`. Fixed in both the YAML block and `--set` flags.

3. **Non-existent `accessMode` Helm value removed**: The blog included `accessMode: ReadWriteOnce` as a configurable Helm value. This is hardcoded in the StatefulSet template and not exposed as a Helm value. Removed from the configuration example.

4. **Non-existent `replicaCount` Helm value removed**: The blog included `replicaCount: 3` as a configurable value. The Scheduler replica count is hardcoded to 3 in the StatefulSet template and not configurable via Helm values. Removed from the configuration example.

5. **Added `etcdSpaceQuota` setting**: The official documentation recommends setting `dapr_scheduler.etcdSpaceQuota` alongside `cluster.storageSize` to ensure the etcd space quota matches the storage allocation. Added to both the YAML and `--set` flags.

6. **Incorrect data directory path (`/data/dapr-scheduler/` -> `/var/run/data/dapr-scheduler/`)**: The blog referenced `/data/dapr-scheduler/` as the etcd data directory. The actual path configured in the Helm chart's `etcdDataDirPath` is `/var/run/data/dapr-scheduler/`. Fixed in the `kubectl exec` command.

7. **Incorrect StatefulSet name (`dapr-scheduler` -> `dapr-scheduler-server`)**: The blog used `dapr-scheduler-0` for pod names and `statefulset/dapr-scheduler` for rollout commands. The actual StatefulSet is named `dapr-scheduler-server`. Fixed in pod references, PVC expected output, and `kubectl rollout` commands.

8. **Legacy AWS EBS provisioner (`kubernetes.io/aws-ebs` -> `ebs.csi.aws.com`)**: The blog used the in-tree provisioner `kubernetes.io/aws-ebs`, which was deprecated in Kubernetes 1.23 and removed in 1.27+. Updated to the CSI driver provisioner `ebs.csi.aws.com`.

9. **Job request body `data` field format**: The blog passed `data` as a nested JSON object. The official Dapr documentation examples show `data` as a JSON-serialized string. Updated to match the official documentation format.

## Review Notes
- The Jobs API is currently in alpha (`v1.0-alpha1`). This is correct as of Dapr v1.17 but may change in future releases. The post should be updated if/when the Jobs API graduates to stable.
- The Scheduler replica count is hardcoded to 3 and cannot be changed via Helm values. This is an architectural decision tied to the embedded etcd cluster quorum requirements.
- The default PVC size in Dapr is 1Gi, not 16Gi. The blog's recommendation of 16Gi is reasonable for production but readers should be aware the default is smaller.
