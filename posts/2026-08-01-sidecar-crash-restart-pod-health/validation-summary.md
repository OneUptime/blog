# Validation Summary: When a Sidecar Crashes: Restarts and Pod Health Explained

## Status
validated

## Post Type
Technical guide / Troubleshooting reference

## Technologies Covered
- Kubernetes 1.36
- Native sidecar containers (restartable init containers)
- Container restart policies and restart rules
- `RestartAllContainersOnContainerExits`
- Liveness, readiness, and startup probes
- Pod conditions, phases, and container statuses
- EndpointSlices and Service readiness
- Kubernetes Jobs
- CrashLoopBackOff and container restart backoff
- Container memory limits and OOM termination
- `kubectl` and `jq`

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Sidecar Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes v1 Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes Assign Memory Resources documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes Enhancement Proposal 753, Sidecar Containers: https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers

## Issues Found
- The post described `RestartAllContainersOnContainerExits` as a Kubernetes 1.36 opt-in feature. It was alpha and disabled by default in Kubernetes 1.35, but is beta and enabled by default in Kubernetes 1.36. The text now states the correct 1.36 feature state and identifies its required `ContainerRestartRules` and `NodeDeclaredFeatures` feature-gate dependencies.

## Review Notes
- Native sidecar containers are stable as of Kubernetes 1.33. The `RestartAllContainers` behavior discussed separately is beta in Kubernetes 1.36 and can still be disabled even though its feature gate and dependencies are enabled by default.
- The YAML structure and fields match the Kubernetes 1.36 API. The `registry.example.com` images are illustrative placeholders, so readers must substitute real images before applying the manifest.
- The `kubectl` flags and JSON status paths are current. Native sidecar status is correctly read from `.status.initContainerStatuses`, and `kubectl logs --previous` exposes only the available previous container instance rather than an unlimited history.
