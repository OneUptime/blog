# Validation Summary: Which Container Stops First? Kubernetes Sidecar Termination Ordering Explained

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes-native sidecar containers (restartable init containers)
- Pod graceful termination
- Container lifecycle hooks and `preStop`
- Linux container stop signals (`SIGTERM` and `SIGKILL`)
- EndpointSlices and terminating endpoint conditions
- `kubectl`

## Sources Consulted
- Kubernetes: Pod Lifecycle, including Pod termination flow, forced termination, stop signals, and sidecar shutdown ordering - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes: Sidecar Containers - https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes: Init Containers - https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes: Container Lifecycle Hooks - https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes kubelet source: `preStop` execution and termination-order wait - https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/kuberuntime/kuberuntime_container.go#L891-L900
- Kubernetes kubelet source: native-sidecar termination dependencies - https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/kuberuntime/kuberuntime_termination_order.go#L42-L94
- Kubernetes API Reference: Pod v1 (`restartPolicy` and `initContainerStatuses`) - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes: Explore Termination Behavior for Pods and Their Endpoints - https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/
- Kubernetes kubectl reference: `kubectl delete` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl reference: `kubectl logs` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl reference: `kubectl get` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Local `kubectl` v1.34.1 command help for `delete`, `logs`, and `get`

## Issues Found
- Clarified that native-sidecar ordering delays sidecar stop signals, not necessarily their `preStop` hooks. The current kubelet executes a container's hook before waiting for its termination-order dependencies, so a sidecar hook can run while main containers are still stopping; the hook must still complete before the stop signal for its own container is sent.
- Added the required caveats for `lifecycle.stopSignal`: it is an alpha API behind the disabled-by-default `ContainerStopSignals` feature gate and requires `spec.os.name`. When enabled, it overrides the image's `STOPSIGNAL`.
- Corrected the blanket statement that regular init containers are never running during Pod shutdown. They are already complete when a started application Pod later terminates, but a Pod can also be deleted while a regular init container is still running; the application-container/sidecar rule does not give that init container a defined position relative to sidecars.
- Qualified force-deletion cleanup. The API server does not wait for kubelet confirmation; immediate node-side cleanup begins only if the kubelet observes the deletion, and processes can otherwise continue running.
- Reworked the shutdown test commands so log streaming and the Pod watch start before deletion and run in separate terminals. The original sequence deleted first and then placed multiple blocking `kubectl logs -f` commands one after another, which could miss short shutdown events or race with removal of the Pod API object.

## Review Notes
- Native sidecars are stable in Kubernetes v1.33 and the `SidecarContainers` feature has been enabled by default since v1.29; older clusters may require the feature gate or may not support the container-level `restartPolicy` field.
- The YAML fragments are intentionally partial Pod-spec excerpts. Their field names, nesting, values, and YAML syntax match the current Pod v1 API.
- The graceful ordering guarantees apply only while enough termination grace time remains. Forced expiry, force deletion, node failure, or an unreachable kubelet can bypass the useful dependency ordering.
