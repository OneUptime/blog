# Validation Summary: Does emptyDir Survive Container Restarts and Pod Replacement?

## Status

validated

## Post Type

Technical guide with a runnable Kubernetes manifest, shell snippets, and `kubectl` verification commands.

## Technologies Covered

- Kubernetes Pods, containers, Pod UIDs, and restart policies
- `emptyDir` volumes and local ephemeral storage
- Disk-backed and memory-backed (`tmpfs`) scratch storage
- PersistentVolumeClaims and generic ephemeral volumes
- Deployments, StatefulSets, Jobs, eviction, and node drain behavior
- `kubectl` custom-column output, logs, exec, and rollout commands
- BusyBox and POSIX-compatible shell scripting

## Sources Consulted

- [Kubernetes volumes and `emptyDir` lifecycle](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Configure a Pod to use a volume](https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/)
- [Kubernetes Pod lifecycle, associated lifetimes, restarts, and fault recovery](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Pod v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes ephemeral volumes and generic ephemeral-volume PVC lifecycle](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes persistent volumes, access modes, and node affinity](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes StatefulSets and stable storage](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes `kubectl drain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes `kubectl rollout restart` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [Kubernetes container lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes memory-backed `emptyDir` resource considerations](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes)
- [Kubernetes registry BusyBox tag list](https://registry.k8s.io/v2/busybox/tags/list)
- [Docker Official Image metadata for BusyBox 1.36.1](https://hub.docker.com/v2/repositories/library/busybox/tags/1.36.1)

## Issues Found

- The example used `registry.k8s.io/busybox:1.36.1`, but that repository does not publish a `1.36.1` tag, so the Pod would enter `ErrImagePull` / `ImagePullBackOff`. Changed it to the published Docker Official Image `docker.io/library/busybox:1.36.1`.
- The opening made remaining on the same node and retaining the same Pod identity sound sufficient for survival under all restart scenarios. A node reboot can recreate the Pod sandbox without evicting the Pod, and a memory-backed `emptyDir` cannot survive a reboot. Limited the claim to a routine container crash and the resulting kubelet-managed container restart; the later node-failure warning remains intact.
- The post referred to a Pod being "rescheduled" after node loss. Kubernetes schedules a given Pod UID only once; controllers create replacement Pods instead. Updated the description, event list, and storage recommendation to describe replacement Pods.
- The PVC recommendation did not account for storage durability and topology. A PVC has a lifecycle independent of a Pod, but a local or node-constrained backing volume may not remain usable after node failure. Qualified the recommendation to require backing storage with appropriate durability and topology.
- The node-drain bullet implied every drain removes these Pods. `kubectl drain` can refuse to proceed over `emptyDir` data unless the operator explicitly permits its deletion, and some Pod types are not deleted by drain. Qualified the statement as a successful drain that evicts or deletes the Pod.
- The first custom-column argument contained an unquoted `[0]`. Although the expression is valid for `kubectl`, shells such as zsh interpret it as a filename glob and can fail before invoking `kubectl`. Quoted the complete output-format argument.

## Review Notes

- The corrected manifest uses current, non-deprecated core/v1 Pod fields and passed client-side parsing with `kubectl` v1.34.1. The replacement image manifest was also confirmed to exist.
- `kubectl logs --previous` works only after at least one container termination. `kubectl exec` works only while this intentionally crash-looping container is running, so it can fail transiently during restart backoff; the 20-second sleep provides a running window.
- Disk-backed `emptyDir` data may happen to remain through some same-node reboots, but Kubernetes does not provide it as a durability guarantee. Memory-backed `emptyDir` data is lost on reboot. The corrected post appropriately promises only routine same-Pod container-restart survival.
- The post correctly qualifies generic ephemeral-volume cleanup with "usually": a `Retain` reclaim policy can allow the backing storage to outlive the generated PVC.
- `restartCount` is suitable for this routine demonstration, but it can reset if the kubelet loses state. The Pod UID remains the authoritative Pod-identity boundary.
