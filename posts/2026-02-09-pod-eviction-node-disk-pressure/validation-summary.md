# Validation Summary: How to Handle Pod Eviction Caused by Node Disk Pressure

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- kubelet eviction configuration
- Ephemeral storage requests and limits
- emptyDir volumes
- kubectl
- Kubernetes Summary API
- Prometheus-style Kubernetes metrics
- Kubernetes Python client

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Node metrics data documentation: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Debugging Nodes With kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post described soft eviction thresholds as default thresholds. Kubernetes only has default hard eviction thresholds; soft thresholds must be configured explicitly. I split the example into default hard thresholds and optional soft threshold configuration.
- The default hard eviction threshold example omitted `memory.available` and `imagefs.inodesFree`, and the disk-pressure signal list omitted newer `containerfs` signals. I added those fields so the explanation matches current Kubernetes eviction documentation.
- The eviction-order explanation said kubelet evicts by QoS class from BestEffort to Burstable to Guaranteed. Current Kubernetes documentation states that kubelet ranks pods by usage above requests, Pod Priority, and relative usage, and QoS is not used directly for ephemeral-storage pressure. I corrected the explanation.
- The Prometheus alert named `EphemeralStorageExceeded` used `kubelet_volume_stats_*` metrics, which report volume/PVC usage and are labeled by `persistentvolumeclaim`, not pod ephemeral-storage usage. I renamed the alert and summary to describe PVC volume capacity usage accurately.
- The manual cleanup commands ran `crictl` directly inside an Ubuntu debug container. Kubernetes mounts the node root filesystem at `/host`, and `chroot /host` may require a privileged debug profile. I updated the commands to use `--profile=sysadmin` and `chroot /host crictl rmi --prune`.
- The cleanup DaemonSet comment said it cleaned old container layers, but the snippet only reported `/var/lib/containerd` disk usage with `df`. I corrected the comment to match the actual command.

## Review Notes
The CronJob cleanup example assumes the `pod-cleaner` service account has RBAC permissions to list and delete pods across namespaces, but the RBAC objects are not included in the post. The article remains technically valid as a focused example, but a future update could include the minimal ClusterRole and ClusterRoleBinding.
