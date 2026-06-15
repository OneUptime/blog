# Validation Summary: How to Debug 'Evicted' Pod Status Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubelet node-pressure eviction
- kubectl
- kubelet configuration
- PodDisruptionBudget
- PriorityClass
- Kubernetes QoS classes
- Prometheus / kube-state-metrics alerts
- crictl
- jq

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Pod QoS documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet config file documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes Process ID Limits and Reservations documentation: https://kubernetes.io/docs/concepts/policy/pid-limiting/
- Kubernetes Pod Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Debugging Nodes With kubectl documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The eviction decision diagram oversimplified pod selection by saying Kubernetes evicts pods exceeding memory, using the most disk, or with the most processes. Updated the labels to reflect Kubernetes' documented eviction factors: requests, priority, and usage, with disk reclaim behavior noted.
- The node disk check used `df -h` inside a debug container, which may report the debug container view rather than the node root filesystem. Updated it to check `/host`, where `kubectl debug node` mounts the node filesystem.
- The PID limit snippet used a runtime-specific `pids_limit` key. Replaced it with kubelet `podPidsLimit`, which is the documented Kubernetes setting for per-Pod PID limits.
- The kubelet eviction threshold YAML had an unterminated quote on `imagefs.available`, making the snippet invalid YAML. Fixed the quote.
- The statement "Pods without requests are evicted first" was too absolute. Updated it to explain that pods with no requests, or pods exceeding requests, are more likely to be evicted first.
- The namespace cleanup command deleted all Failed pods, not only Evicted pods. Replaced it with a JSON filter on `.status.reason=="Evicted"`.
- The CronJob cleanup example used `jq` inside an image that may not include it. Replaced that command with `kubectl --no-headers` and `awk` so the example does not depend on an unstated `jq` binary in the container image.

## Review Notes
The post is technically relevant and generally aligned with current Kubernetes documentation. The examples assume metrics-server or another Metrics API provider for `kubectl top`, kube-state-metrics for the Prometheus metrics, node-level permissions for `kubectl debug node`, and appropriate RBAC for the cleanup CronJob.
