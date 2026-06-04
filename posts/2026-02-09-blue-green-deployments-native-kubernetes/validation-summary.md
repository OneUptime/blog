# Validation Summary: How to Implement Blue-Green Deployments Using Native Kubernetes Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services
- Kubernetes Deployments
- Kubernetes Ingress
- Kubernetes EndpointSlices
- kubectl
- Kubernetes Python client
- Bash scripting

## Sources Consulted
- Kubernetes Service documentation: https://v1-33.docs.kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The complete Service example selected pods with `active: "true"`, but the automation script read and patched `.spec.selector.version`. Updated the complete example to use `version: blue` as the active Service selector so the YAML and script describe the same blue-green mechanism.
- The script patched the inactive Deployment's `active` label before smoke testing, which would have allowed the production Service selector to include both blue and green pods in the original example. Removed the `active` label patching and kept the production switch on the Service's `version` selector.
- The script attempted to read `.status.loadBalancer.ingress[0].ip` from a `ClusterIP` test Service. Replaced that with a temporary `kubectl run` smoke-test pod using `curlimages/curl` so the health check runs from inside the cluster and can resolve the internal Service.
- The script alternates between blue and green test Services, but the manifest only defined `api-service-green-test`. Added the matching `api-service-blue-test` Service.
- The monitoring example used the deprecated `v1 Endpoints` API. Updated it to list `discovery.k8s.io/v1` EndpointSlices by the `kubernetes.io/service-name` label.
- The "progressive rollout" example implied a Service selector could switch only part of traffic. Clarified that a single Service selector can select one set or both sets of pods, while controlled traffic percentages require an Ingress, Gateway API, service mesh, or similar controller.

## Review Notes
The remaining examples use current stable Kubernetes APIs (`apps/v1` Deployment, `v1` Service, `networking.k8s.io/v1` Ingress, and `discovery.k8s.io/v1` EndpointSlice). The blue-green Service selector switch is technically valid, but production systems should still account for connection draining, client retry behavior, database compatibility, and any load balancer or ingress controller behavior outside the native Service selector itself.
