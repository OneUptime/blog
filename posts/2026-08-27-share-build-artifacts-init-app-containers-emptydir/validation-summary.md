# Validation Summary: Share Build Artifacts Between Init and App Containers with emptyDir

## Status

validated

## Post Type

Technical tutorial / implementation guide

## Technologies Covered

- Kubernetes Pods
- Regular init containers and application containers
- `emptyDir` volumes, volume mounts, and `subPath`
- Local ephemeral-storage requests, limits, accounting, and eviction
- Memory-backed `emptyDir` volumes
- Linux/POSIX directory rename semantics
- BusyBox shell utilities and SHA-256 verification
- `kubectl` and `jq`

## Sources Consulted

- [Kubernetes init containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes volumes: `emptyDir`, `subPath`, and read-only mounts](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes resource management and memory-backed `emptyDir` considerations](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes)
- [Kubernetes Pod v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes security-context documentation](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [`kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/) references
- [Kubernetes v1.37 kubelet `subPath` handling](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/kubelet_pods.go#L349-L370)
- [Kubernetes v1.37 local-storage eviction implementation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/eviction/eviction_manager.go#L542-L630)
- [Kubernetes v1.37 resource aggregation implementation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/component-helpers/resource/helpers.go#L230-L288) and [regular-init limit test](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/component-helpers/resource/helpers_test.go#L1139-L1168)
- [Official `registry.k8s.io` BusyBox tag listing](https://registry.k8s.io/v2/busybox/tags/list)
- [Docker Official BusyBox image](https://hub.docker.com/_/busybox) and [BusyBox 1.36.1 image metadata](https://hub.docker.com/layers/library/busybox/1.36.1/images/sha256-26b450bda498cfe682862cb67137755c7303c5caa4b7634c559e27c1613af724)
- [POSIX `rename()` specification](https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html)

## Issues Found

- The manifest referenced `registry.k8s.io/busybox:1.36.1` in all three containers, but that repository does not publish a `1.36.1` tag. The Pod would enter image-pull backoff before the build could run. All three references were changed to the verified Docker Official Image `docker.io/library/busybox:1.36.1`.
- The post stated that a directory `subPath` must already exist before the application container starts. Kubelet creates a missing non-image directory `subPath`, so the statement was too absolute. It was changed to state that the init sequence ensures the `release` directory and its files are populated before application startup.
- Disk-backed `emptyDir.sizeLimit` and aggregate `ephemeral-storage` limits were described as unconditional caps or ceilings. Kubelet monitors these as asynchronous eviction thresholds, and limit-based eviction depends on kubelet being able to measure the relevant local filesystems. The storage-accounting text was corrected accordingly.
- The post stated that omitting a limit on any regular init container makes the effective init limit unbounded. That generic statement does not match current kubelet ephemeral-storage aggregation and eviction behavior. It was removed while retaining the correct calculation for this manifest: an effective request of 320 MiB and limit of 512 MiB.

## Review Notes

- The corrected manifest passes Kubernetes client-side parsing and dry-run validation. The exact BusyBox image was pulled, and the build, same-filesystem rename, checksum verification, and artifact-read commands completed successfully.
- The manifest uses stable `core/v1` fields and no deprecated Kubernetes APIs.
- A namespace enforcing the Restricted Pod Security Standard would reject this deliberately minimal example because it omits the required container security settings. The post already directs readers to test the exact images under their cluster's Pod Security settings.
- A read-only mount prevents writes through that mount; it does not make the underlying volume globally immutable. In this example, the application container has no writable mount of the artifact volume.
- Sharing a PVC concurrently across Pods requires a compatible access mode and storage backend.
