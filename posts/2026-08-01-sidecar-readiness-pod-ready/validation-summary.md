# Validation Summary: Does a Sidecar Readiness Probe Make the Whole Pod Unready?

## Status
validated

## Post Type
Technical explainer / operational guide

## Technologies Covered
- Kubernetes Pods and Pod conditions
- Native sidecar containers (restartable init containers)
- Legacy sidecars (application containers)
- Readiness, liveness, and startup probes
- Services and EndpointSlices
- Pod readiness gates
- Kubernetes Jobs
- `kubectl` and JSONPath

## Sources Consulted
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Configure Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: Pod Lifecycle, Conditions, and Readiness Gates](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions)
- [Kubernetes API: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes API: EndpointSlice v1](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes: Explore Termination Behavior for Pods and Their Endpoints](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes kubelet status generation source](https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/status/generate.go)

## Issues Found
1. **Missing `publishNotReadyAddresses` exception** - The post stated in several places that a failed readiness probe makes matching Service EndpointSlices unready and stops ordinary Service traffic. Kubernetes-generated EndpointSlices instead report endpoints as ready for a Service with `spec.publishNotReadyAddresses: true`, regardless of the backing Pod's readiness. Updated the introductory explanation, the readiness-effects list, and the Service behavior section to scope the routing behavior to Services without that setting.

## Review Notes
- Native sidecar containers are stable as of Kubernetes v1.33; the `SidecarContainers` feature has been enabled by default since v1.29. Clusters older than v1.29 may not accept or enable the container-level `restartPolicy: Always` syntax used for restartable init containers.
- Verified in the kubelet status-generation source that restartable init-container statuses are included when Kubernetes generates both `ContainersReady` and `Ready`.
- The YAML fields and probe values are structurally valid for a current Kubernetes Pod. The `registry.example.com` images and their health paths are illustrative placeholders, so the manifest is not a self-contained deployable example without corresponding images.
- The EndpointSlice inspection command assumes that a Service named `checkout` exists in the current namespace and selects the Pod. This is consistent with the surrounding conditional wording but the Service itself is not included in the example.
- The `kubectl get`, JSONPath, `kubectl logs --previous`, event field selector, and `--sort-by=.lastTimestamp` command forms are current and valid.
- All external links in the post resolved successfully during validation.
