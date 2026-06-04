# Validation Summary: How to Fix Kubernetes Pod Evictions Caused by Node Memory Pressure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubelet node-pressure eviction
- Kubernetes resource requests and limits
- Kubernetes local ephemeral storage
- Kubernetes PriorityClass
- kubectl
- Prometheus alert rules

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Kubelet Configuration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- Corrected the description of disk pressure and kubelet filesystem eviction signals. The post originally described disk pressure as filesystem usage or inode consumption exceeding limits and referenced volume filesystems. Kubernetes eviction signals are based on available space or free inodes on `nodefs`, `imagefs`, and supported `containerfs` configurations.
- Corrected kubelet eviction ordering. The post originally implied priority and resource usage were the primary ordering and that critical system pods are never evicted. Kubernetes ranks pods by whether usage exceeds requests, then pod priority, then usage relative to requests; high-priority pods are protected but not absolutely immune in all node-starvation scenarios.
- Corrected default eviction threshold examples. The post showed non-existent default soft memory thresholds. Kubernetes defaults hard eviction thresholds, while `evictionSoft` and `evictionSoftGracePeriod` default to nil.
- Corrected the `kubectl top nodes` sample output columns to match the official `kubectl top node` output shape.
- Corrected the memory requests and limits listing command so it reports all containers rather than only `spec.containers[0]`, and changed the comment so it does not claim to identify pods exceeding requests without comparing live usage.
- Corrected resource request and memory limit explanations. A memory request is used for scheduling and eviction decisions, not guaranteed memory in the strict QoS sense; memory limits are enforced reactively through OOM kills.
- Corrected the Burstable QoS explanation and namespace ResourceQuota claim. The original wording overstated the request-limit difference and implied namespace quotas prevent consumption from exceeding node capacity.
- Replaced the pod-based log rotation example with kubelet `containerLogMaxSize` and `containerLogMaxFiles` configuration, matching Kubernetes logging architecture.
- Replaced the disk cleanup DaemonSet example. The original used `crictl` in an Alpine image without providing the tool and deleted kubelet-managed volumes and pod logs directly. The revised example scopes cleanup to an explicitly owned host path.
- Added missing `imagefs.inodesFree` examples in eviction threshold snippets.
- Fixed the PriorityClass workload examples. The `apps/v1` Deployment lacked a required selector and matching pod template labels, and the Job pod template lacked an explicit valid `restartPolicy`.
- Narrowed the priority eviction claim to pods in the same eviction category, matching Kubernetes documentation.

## Review Notes
The post is now technically valid as a general Kubernetes guide. Some operational examples, such as SSHing to nodes and restarting kubelet, remain environment-specific and should be adapted for managed Kubernetes platforms where node access or kubelet configuration is controlled by the provider.
