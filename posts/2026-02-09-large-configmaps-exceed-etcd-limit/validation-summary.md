# Validation Summary: How to Handle Large ConfigMaps That Exceed the 1MB etcd Size Limit

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Deployments
- Kubernetes projected volumes
- Kubernetes init containers
- Kubernetes PersistentVolumeClaims
- Kubernetes CronJobs
- Kubernetes RBAC
- kubectl
- Python

## Sources Consulted
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- kube-state-metrics ConfigMap metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/configmap-metrics.md

## Issues Found
- The post described the limit as a 1MB etcd per-object limit. Kubernetes documentation states that ConfigMap data cannot exceed 1 MiB, so the title, description, introduction, limit explanation, and closing wording were corrected.
- The post implied all ConfigMap data is base64 encoded. Kubernetes ConfigMaps use `data` for UTF-8 strings and `binaryData` for base64-encoded binary data, so the size-overhead explanation was narrowed to `binaryData`.
- Several `apps/v1` Deployment manifests omitted the required `.spec.selector` and matching pod template labels. These were added to the Deployment examples.
- The one-shot PVC loader Pod used the default `restartPolicy: Always`, which would rerun a successful loader container. `restartPolicy: OnFailure` was added.
- The ConfigMap reference keys did not match the Python example's environment variable names. The keys were changed to `MODEL_URL`, `WEIGHTS_URL`, `CONFIG_URL`, and `MODEL_CHECKSUM`, and the Python download now calls `raise_for_status()`.
- The ML deployment example assumed `jq` was available in the Google Cloud SDK image. The parsing commands were changed to use Python's standard `json` module and quoted shell variables.
- The Prometheus alert used `kube_configmap_metadata_resource_version` as if it represented ConfigMap size. kube-state-metrics documents that metric as resource version metadata, not payload size, so the example was replaced with a scheduled `kubectl` size check.

## Review Notes
The size-check examples based on `kubectl get -o yaml | wc -c` estimate serialized object size rather than exact API validation payload size, but they are useful as conservative operational checks. For production alerting, expose this check as a custom metric or enforce size limits in CI before applying manifests.
