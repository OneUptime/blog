# Validation Summary: How to Monitor Custom Calico Ingress Gateways

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source network policy
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes LoadBalancer Services
- kubectl JSONPath output
- Envoy proxy container image

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico automatic labels reference: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico namespace policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Services, Load Balancing, and Networking documentation: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes API reference for Service resources: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Envoy Docker image documentation: https://www.envoyproxy.io/docs/envoy/latest/start/docker.html

## Issues Found
- The Kubernetes Service exposed two ports without `name` fields. Kubernetes requires service port names when multiple ports are defined, so I added `name: http` and `name: https`.
- The Calico examples used a Kubernetes namespace label in one `namespaceSelector` and did not scope the global gateway policy to the gateway namespace. I changed the policy examples to use Calico's documented `projectcalico.org/name` namespace label and scoped the GlobalNetworkPolicy to `gateway-system`.

## Review Notes
- The gateway namespace and any backend namespace labels, such as `gateway-accessible=true`, must exist before applying these manifests.
- The Envoy deployment is a minimal illustrative gateway deployment. A real gateway needs an Envoy configuration appropriate for the backend routes and health endpoint.
