# Validation Summary: Kubernetes Pod Running but Not Ready: A Diagnostic Checklist

## Status
validated

## Post Type
Technical diagnostic guide

## Technologies Covered

- Kubernetes Pods and Pod conditions
- kubectl commands and JSONPath output
- Liveness, readiness, and startup probes
- Ordinary and native sidecar containers
- Pod readiness gates and custom status conditions
- Services and EndpointSlices
- Ephemeral debug containers

## Sources Consulted

- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Pod Conditions](https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/)
- [Kubernetes Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Configure Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/)
- [Kubernetes Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [kubectl debug reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes Pod table-printer implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/printers/internalversion/printers.go)

## Issues Found

- The `PodReadyToStartContainers` bullet implied that this condition is unconditionally present. It is controlled by the `PodReadyToStartContainersCondition` feature gate, although that gate is enabled by default in current Kubernetes releases. The bullet now states that qualification.
- The EndpointSlice section said generally that EndpointSlice readiness reflects Pod readiness. More precisely, `conditions.serving` maps to the backing Pod's `Ready` condition, while `conditions.ready` normally combines serving and non-terminating state and is forced to true by `publishNotReadyAddresses`. The paragraph now explains those semantics accurately.

## Review Notes

- Native sidecar containers declared in `spec.initContainers` with `restartPolicy: Always` are stable as of Kubernetes v1.33 and have been enabled by default since v1.29. Older clusters require a compatibility check.
- The Deployment YAML passed client-side parsing and structural checks with `kubectl` v1.34.1. The documented `kubectl get`, `logs`, `describe`, `debug`, label-selector, watch, JSONPath, and output flags are current.
- The current Kubernetes Pod table-printer implementation confirms that restartable init containers are included in the `READY` numerator and denominator.
- All links in the post returned successful HTTP responses during validation.
