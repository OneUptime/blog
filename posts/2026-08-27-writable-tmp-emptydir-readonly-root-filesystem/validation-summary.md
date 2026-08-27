# Validation Summary: How to Make /tmp Writable with emptyDir When readOnlyRootFilesystem Is Enabled

## Status

validated

## Post Type

Tutorial / Guide

## Technologies Covered

- Kubernetes Deployments and Pod specifications
- Pod and container security contexts
- `readOnlyRootFilesystem`, non-root execution, Linux capabilities, and seccomp
- `emptyDir` volumes, volume mounts, and `subPath`
- Local ephemeral-storage and memory resource accounting
- Init containers and Pod-scoped volume lifecycle
- `kubectl`, JSONPath, and Linux mount inspection
- Kubernetes Pod Security Standards

## Sources Consulted

- [Kubernetes 1.37 release information](https://kubernetes.io/releases/1.37/)
- [Kubernetes Deployment API](https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/)
- [Kubernetes Pod API, including SecurityContext, PodSecurityContext, VolumeMount, and emptyDir fields](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes Volumes: emptyDir and subPath](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes Local Ephemeral Storage](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes Resource Management: memory-backed emptyDir volumes](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes)
- [Configure Pod Initialization](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-initialization/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [kubectl exec reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes v1.37.0 kubelet source for directory subPath creation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/kubelet/kubelet_pods.go)
- [Linux kernel documentation for /proc/self/mountinfo](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)

## Issues Found

- The default `emptyDir` medium was described as necessarily disk-backed. Changed the wording to the node's default storage medium and local `ephemeral-storage`, because the physical backing depends on the node environment and `sizeLimit` limits capacity without reserving it for scheduling.
- The `subPath` guidance said every required directory must already exist. Removed that requirement because kubelet creates missing directory subpaths for writable volumes; the mounts still share the volume's single capacity budget.
- The validation command inferred a read-only root filesystem from failure to write under `/usr/local/bin`. Since the container runs as UID 10001, that write can fail from ordinary Unix permissions even when the root filesystem is writable. Replaced the false-positive-prone check with inspection of the root mount's `ro` option in `/proc/self/mountinfo`, while retaining the explicit `/tmp` write-and-remove test.
- The SecurityContext API link used a legacy URL that redirected to the current API reference. Updated it to the canonical `core/pod-v1` URL.

## Review Notes

- The full Deployment manifest is syntactically valid and uses current, non-deprecated Kubernetes APIs and fields. Client-side decoding also succeeded with kubectl v1.34.1, and the fields remain current in the Kubernetes v1.37 API documentation.
- The revised shell check succeeded with a read-only container root and writable tmpfs at `/tmp`, and correctly rejected the same container configuration when its root filesystem was writable.
- The manifest and `/proc` validation command are Linux-specific. The command assumes that the application image contains `sh`, `touch`, and `rm`; distroless images need an equivalent image-appropriate validation method.
- The three-volume fragment declares size limits totaling 400 MiB. If it is combined with the first manifest unchanged, the Pod's 256 MiB overall `ephemeral-storage` limit, which also covers logs and writable layers, can trigger eviction before all three volume limits are simultaneously reached.
- Default-medium `emptyDir` and local ephemeral-storage limits depend on kubelet accounting and supported node filesystem layouts; node pressure can exhaust available space before an `emptyDir.sizeLimit` is reached.
- `registry.example.com/document-api:3.8.0` is an illustrative placeholder image and must be replaced with a real application image before deployment.
