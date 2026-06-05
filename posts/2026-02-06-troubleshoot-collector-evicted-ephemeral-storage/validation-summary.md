# Validation Summary: How to Troubleshoot Collector Pods Being Evicted Due to Ephemeral Storage

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector persistent sending queue
- OpenTelemetry Collector file storage extension
- Kubernetes Deployments and DaemonSets
- Kubernetes local ephemeral storage
- Kubernetes PersistentVolumeClaims, emptyDir, and hostPath volumes
- kubectl, jq, and Prometheus alerting

## Sources Consulted
- Kubernetes: Local ephemeral storage: https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes: Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: Volumes, including emptyDir, persistentVolumeClaim, and hostPath: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes: Ephemeral Volumes: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/
- Kubernetes: Node metrics data and Summary API: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes: kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- OpenTelemetry Collector exporterhelper persistent queue documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector Contrib file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage

## Issues Found
- The Deployment and DaemonSet examples used `apps/v1` but omitted required selector and matching pod template labels. Added `spec.selector.matchLabels` and `template.metadata.labels` to both examples so the manifests are structurally valid Kubernetes workload objects.
- The Deployment example referenced a PVC in the `observability` namespace, but the Deployment did not specify that namespace. Added `metadata.namespace: observability` so the pod and PVC are in the same namespace.
- The monitoring command used `.status.ephemeralContainerStatuses`, which reports statuses for debug ephemeral containers, not ephemeral storage usage. Replaced it with a kubelet Summary API command that reads the pod's `ephemeralStorage.usedBytes`.

## Review Notes
- The `hostPath` guidance is technically correct that hostPath usage is not treated as pod ephemeral storage usage, but Kubernetes documents significant security risks and warns that excessive hostPath disk usage can still cause node disk pressure.
- The `emptyDir.sizeLimit` guidance is correct for disk-backed emptyDir volumes; memory-backed emptyDir volumes are accounted against memory instead.
