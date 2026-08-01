# Validation Summary: Why Your Kubernetes Job Never Completes When a Sidecar Keeps Running

## Status
validated

## Post Type
Troubleshooting guide and tutorial

## Technologies Covered

- Kubernetes Jobs and Pods
- Native sidecar containers and init containers
- Container restart policies and Pod lifecycle
- Startup and readiness probes
- Graceful container termination and lifecycle hooks
- `kubectl`
- Kubernetes YAML and POSIX shell commands

## Sources Consulted

- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes API Reference: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes: Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes: Feature Gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes: Well-Known Labels, Annotations and Taints](https://kubernetes.io/docs/reference/labels-annotations-taints/)
- [Kubernetes: Adopting Sidecar Containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)
- [Kubernetes: `kubectl apply`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)

## Issues Found

- The Pod lookup and watch commands selected the deprecated `job-name` label. Kubernetes 1.27 and newer use `batch.kubernetes.io/job-name`, so both selectors were updated to the prefixed label.
- The post grouped `activeDeadlineSeconds` under “Job retry settings,” but that field imposes a runtime deadline rather than configuring retries. The introductory wording now calls both fields “Job settings.”
- The server-side dry-run command did not print the admitted object, so it could miss an API server dropping the sidecar-only field when the feature is unavailable or disabled. The command now uses `-o yaml`, and the text tells readers to confirm that `restartPolicy: Always` was retained.
- The version section did not state that the 1.28 alpha lacked the termination-ordering guarantee discussed later in the post. It now recommends Kubernetes 1.29 or later when that guarantee matters.
- The mixed-version warning mentioned only kubelet support. Native sidecars also require compatible control-plane components and, on Kubernetes 1.28 through 1.32, consistent `SidecarContainers` feature-gate enablement. The warning was expanded accordingly.
- The end-to-end checklist said to verify log delivery before the Pod “disappears,” even though completed Job Pods are normally retained. It now correctly requires delivery before the sidecar terminates.

## Review Notes

The example images and application-specific commands are illustrative placeholders, and the fallback is explicitly identified as a protocol sketch. All YAML blocks parse successfully. The Kubernetes fields, native-sidecar startup and shutdown semantics, Job retry/deadline behavior, lifecycle-hook caveats, version milestones (alpha in 1.28, beta and enabled by default in 1.29, stable in 1.33), and `kubectl` flags were checked against the official sources above. Server-side dry run validates API admission but cannot by itself prove that every eligible kubelet supports the feature; the post now retains that distinction and covers control-plane compatibility as well.
