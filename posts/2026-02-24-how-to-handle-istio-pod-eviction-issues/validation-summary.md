# Validation Summary: How to Handle Istio Pod Eviction Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy sidecar proxy
- Kubernetes pod eviction
- Kubernetes QoS classes
- Kubernetes PriorityClass
- Kubernetes PodDisruptionBudget
- kubectl
- PrometheusRule

## Sources Consulted
- Kubernetes documentation: Node-pressure Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: API-initiated Eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes documentation: Pod Quality of Service Classes, https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes kubectl reference: kubectl top pod, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl reference: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Istio documentation: Resource Annotations, https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Sidecar, https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio documentation: Configuration Scoping, https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/

## Issues Found
- The post described pod eviction as including containers that exceed memory limits. I changed this to distinguish kubelet/API pod eviction from container OOMKills, which restart containers but are not the same as pod eviction.
- The node-pressure eviction explanation said kubelet evicts based on QoS class and resource usage. I updated it to match Kubernetes' documented ordering: usage above requests, pod priority, and usage relative to requests. QoS remains useful for estimating likely eviction behavior.
- The `kubectl top pods -A --containers` memory sort used `sort -k4`, which sorts the CPU column in the container output. I changed the command to use `kubectl top`'s documented `--sort-by=memory` option.
- The node-specific sidecar memory command included the header row from `kubectl get pods`, causing an unnecessary failed `kubectl top pod NAME -n NAMESPACE` call. I added `--no-headers`.
- The BestEffort QoS section incorrectly said a pod might still be BestEffort if the sidecar has resource limits but the application container does not. I corrected this: any CPU or memory request/limit on any container makes the pod Burstable unless it meets Guaranteed criteria.
- The Guaranteed QoS section said such pods are "the last to be evicted." I softened this to "less likely to be evicted under node pressure" to reflect Kubernetes' documented priority and request-based eviction behavior.
- The Sidecar resource used `networking.istio.io/v1beta1`. I updated it to the current documented `networking.istio.io/v1` API version.

## Review Notes
The post is technically relevant and the remaining examples are appropriate for a current Kubernetes and Istio troubleshooting guide. Some numeric sidecar memory savings are workload- and mesh-size-dependent, but the qualitative guidance to scope sidecar configuration is consistent with Istio documentation.
