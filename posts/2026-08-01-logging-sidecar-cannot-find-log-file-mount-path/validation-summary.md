# Validation Summary: Why a Logging Sidecar Cannot Find the App Log File

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes Pods and multi-container workloads
- Logging sidecars and node-level logging
- Kubernetes `emptyDir` volumes and `volumeMounts`
- `subPath` and log rotation
- Pod and container security contexts, including `fsGroup`
- Container startup probes and restart behavior
- `kubectl get`, `describe`, `exec`, and `debug`

## Sources Consulted

- [Kubernetes: Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes: Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Communicate Between Containers in the Same Pod Using a Shared Volume](https://kubernetes.io/docs/tasks/access-application-cluster/communicate-containers-same-pod-shared-volume/)
- [Kubernetes: Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [kubectl exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/), and [kubectl debug](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Linux man-pages: open(2)](https://man7.org/linux/man-pages/man2/open.2.html) and [rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html) for open-file and rename semantics relevant to replacement-based rotation

## Issues Found

- The example set `fsGroupChangePolicy: OnRootMismatch` on an `emptyDir`. Kubernetes documents that `fsGroupChangePolicy` has no effect on ephemeral volume types including `emptyDir`, so the ineffective field was removed. The `fsGroup: 2000` setting remains and applies the shared supplementary group needed by both containers.
- The startup-probe wording implied that a probe could protect the reader's process lifecycle. A startup probe actually defers liveness and readiness probes until startup succeeds and eventually restarts the container if it fails; it cannot prevent the reader process from exiting. The sentence was corrected to state those limits.
- The debugging advice implied that choosing a `kubectl debug` profile was enough to inspect the shared filesystem. A default ephemeral debug container has no inherited mounts. The advice now requires a custom profile with the shared volume mount or a copied Pod containing a debugging container with that mount.

## Review Notes

- The Pod manifest uses current `v1` Pod fields and valid YAML. The `example.com` images and `sha256:REPLACE_ME` digests are explicit placeholders; readers must replace them with real images and digests whose entrypoints support the shown environment variable and argument.
- Kubernetes-native sidecars are stable starting with Kubernetes v1.33. The manifest itself uses two ordinary app containers and does not depend on the native-sidecar API.
- The remaining claims about per-container volume mounts, `emptyDir` lifetime, read-only mount permissions, `subPath` rotation behavior, concurrent ordinary-container startup, stdout/stderr logging, and command syntax agree with the consulted documentation.
