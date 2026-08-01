# Validation Summary: Kubernetes Native Sidecar, Init, and App Container Startup Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods and kubelet lifecycle behavior
- Native sidecar containers (restartable init containers)
- Regular init containers and application containers
- Startup, readiness, and liveness probes
- Container restart policies and restart policy rules
- Container lifecycle hooks
- `kubectl` and `jq`

## Sources Consulted
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes v1.35: New level of efficiency with in-place Pod restart](https://kubernetes.io/blog/2026/01/02/kubernetes-v1-35-restart-all-containers/)
- [Kubernetes: Container Lifecycle Hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes v1.36 API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found
- The post said Kubernetes 1.36 added the `RestartAllContainers` exception. The feature was introduced as alpha in Kubernetes 1.35, then promoted to beta and enabled by default in Kubernetes 1.36. Updated the sentence to describe the 1.36 promotion accurately while retaining the feature-gate caveat.

## Review Notes
- Native sidecars are stable as of Kubernetes 1.33; the feature was enabled by default starting in Kubernetes 1.29. Older clusters require version and feature-gate compatibility checks.
- Individual container restart policies and rules are beta and enabled by default as of Kubernetes 1.35. The `RestartAllContainers` action is beta and enabled by default as of Kubernetes 1.36.
- The example image names, ports, and health endpoints are illustrative placeholders. The Pod manifest structure and fields are valid for a current Kubernetes cluster, but users must substitute images that implement the shown arguments and endpoints.
