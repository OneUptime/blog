# Validation Summary: How to Configure Resource Limits and Requests for Kubernetes Pods

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes CPU and memory requests and limits
- Kubernetes QoS classes
- Kubernetes LimitRange
- Kubernetes ResourceQuota
- kubectl
- Vertical Pod Autoscaler

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes documentation: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Assign CPU Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/
- Kubernetes documentation: Assign Memory Resources to Containers and Pods - https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes autoscaler documentation and API source for Vertical Pod Autoscaler - https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler

## Issues Found
- The CPU throttling examples used only `/sys/fs/cgroup/cpu/cpu.stat`, which is specific to some cgroup v1 layouts and can fail on cgroup v2 nodes. Updated the commands to try the cgroup v2 `cpu.stat` location first, then common cgroup v1 paths.
- The memory-limit explanation said Kubernetes terminates a container when it exceeds its memory limit. Kubernetes documentation describes memory limit enforcement as reactive: the kernel may terminate the container with an OOM kill when memory pressure is detected. Updated the wording to reflect that behavior.
- The CPU throttling sample output used `throttled_time`, a cgroup v1 field. Updated the sample to `throttled_usec`, which matches cgroup v2 output used by the revised command.

## Review Notes
The Kubernetes manifests are syntactically valid YAML and use current API versions for the built-in resources shown. The Vertical Pod Autoscaler example uses the external VPA CRD, so it requires VPA to be installed in the cluster before `kubectl describe vpa web-vpa` will work.
