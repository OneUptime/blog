# Validation Summary: How to Use Container Resource Resize Policies for In-Place Vertical Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Deployments
- Kubernetes StatefulSets
- Container resource requests and limits
- In-place Pod vertical scaling
- Container `resizePolicy`
- Vertical Pod Autoscaler
- kubectl
- Kubernetes Python client

## Sources Consulted
- Kubernetes documentation: Resize CPU and Memory Resources assigned to Containers - https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/
- Kubernetes documentation: Pod Lifecycle, Resizing Pods - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes blog: Kubernetes v1.33 In-Place Pod Resize Graduated to Beta - https://v1-35.docs.kubernetes.io/blog/2025/05/16/kubernetes-v1-33-in-place-pod-resize-beta/
- Kubernetes blog: Kubernetes 1.35 In-Place Pod Resize Graduates to Stable - https://kubernetes.io/blog/2025/12/19/kubernetes-v1-35-in-place-pod-resize-ga/
- Kubernetes autoscaler API reference for VPA `ContainerResourcePolicy` - https://pkg.go.dev/k8s.io/autoscaler/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1

## Issues Found
- The post said in-place container resource resize was stable in Kubernetes 1.29. Updated this to alpha in 1.27, beta in 1.33, and stable in 1.35.
- The description and introduction implied all in-place scaling avoids pod restarts. Updated wording to reflect that in-place resize can avoid pod disruption, but container restarts may still be required depending on `resizePolicy`.
- Several YAML examples nested `resizePolicy` under `resources`. Moved `resizePolicy` to the container level, which is the correct Kubernetes schema location.
- Pod resize commands patched Pods directly. Updated them to use the Pod `resize` subresource with `kubectl patch pod ... --subresource=resize`, matching current Kubernetes guidance.
- The Deployment memory example patched the Deployment pod template and then used rollout status, which would create replacement Pods rather than resizing existing Pods in place. Updated the example to select an existing Pod and patch its resize subresource.
- Monitoring examples used the deprecated/removed `.status.resize` field and old state names such as `Proposed`. Updated monitoring to use `PodResizePending` and `PodResizeInProgress` conditions with `Deferred` and `Infeasible` reasons.
- The Python monitoring script checked `pod.status.resize` and emphasized `allocated_resources`. Updated it to inspect resize conditions and `container_statuses[].resources`, which Kubernetes documentation recommends for monitoring actual running resources.
- The progressive scaling script waited only for Pod readiness, which does not prove a resize completed. Updated it to wait until `status.containerStatuses[0].resources.requests.cpu` reports the requested CPU value.
- The best-practice note said high limits affect scheduling. Corrected it to state that requests drive scheduling, while limits define runtime enforcement.
- Added the current VPA caveat that `InPlace` mode is alpha in VPA 1.7.0 and requires the relevant Kubernetes and VPA feature gates.

## Review Notes
The post is technically relevant and now aligns with current Kubernetes in-place Pod resize behavior. Local `kubectl` validation could not be performed because `kubectl` is not installed in this workspace; command syntax was checked against official Kubernetes documentation, and all YAML snippets were locally parsed for syntax.
