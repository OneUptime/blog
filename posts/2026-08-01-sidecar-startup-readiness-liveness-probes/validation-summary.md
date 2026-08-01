# Validation Summary: When Should a Sidecar Use `startupProbe`, `readinessProbe`, and `livenessProbe`?

## Status

validated

## Post Type

Technical guide / reference

## Technologies Covered

- Kubernetes 1.36
- Kubernetes-native sidecar containers
- Pod init-container ordering and lifecycle
- Startup, readiness, and liveness probes
- HTTP, TCP, gRPC, and exec probe mechanisms
- Services and EndpointSlices
- Container restart policies and `RestartAllContainers`
- `kubectl` Pod, log, and EndpointSlice troubleshooting commands

## Sources Consulted

- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Configure Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes API: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes API: EndpointSlice v1](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes v1.33: Continuing the transition from Endpoints to EndpointSlices](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)

## Issues Found

- The startup-ordering explanation treated startup-probe success as the complete milestone for a native sidecar. A configured `postStart` lifecycle handler must also complete before the sidecar is marked started. Changed the sentence to state that startup-probe success is required and preserved the lifecycle-hook requirement.
- The readiness explanation did not state the `publishNotReadyAddresses` exception, under which a Service deliberately keeps the EndpointSlice `ready` condition true even when the Pod is not ready. Added the exception and changed the example sequence to refer to a matching Service, because the sample manifest defines only a Pod.
- The probe-mechanism summary described `httpGet` as always targeting the Pod IP. The kubelet uses the Pod IP by default, but `httpGet.host` can override the destination. Added “by default” to make the statement exact.

## Review Notes

- All five YAML blocks parse successfully. Their field names, probe thresholds, named HTTP ports, numeric application port, resource quantities, and native-sidecar `restartPolicy: Always` placement agree with the current Kubernetes API and probe documentation.
- The images under `registry.example.com` and the health paths are intentionally illustrative placeholders; a deployable workload needs real images that expose the stated ports and endpoints.
- Native sidecars are stable as of Kubernetes 1.33, and the `SidecarContainers` feature gate has been enabled by default since Kubernetes 1.29.
- `RestartAllContainers` is beta and enabled by default in Kubernetes 1.36, but it still requires an explicit container `restartPolicyRules` entry whose exit-code condition matches. The post's normal “restart only the sidecar” consequence is correct when no such rule applies.
- The `kubectl describe`, `get`, `logs`, `logs --previous`, and EndpointSlice label-selector commands are current. The official Kubernetes EndpointSlice migration example uses the same singular `endpointslice` resource name and `kubernetes.io/service-name` selector.
- All six official-documentation links already present in the post returned HTTP 200 during validation.
