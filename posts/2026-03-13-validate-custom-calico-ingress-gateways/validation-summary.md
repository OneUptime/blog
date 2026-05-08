# Validation Summary: How to Validate Custom Calico Ingress Gateways

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source NetworkPolicy and GlobalNetworkPolicy
- Kubernetes Deployments
- Kubernetes Services of type LoadBalancer
- kubectl JSONPath output
- Envoy proxy container deployment
- Mermaid architecture diagrams

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The Kubernetes Service exposed both ports 80 and 443 without port names. Kubernetes requires all ports to be named when a Service has multiple port definitions. Added `name: http` and `name: https`.
- The LoadBalancer verification command only read `.status.loadBalancer.ingress[0].ip`. Kubernetes LoadBalancer status may expose either `ip` or `hostname`, depending on the provider. Updated the command to fall back to `.status.loadBalancer.ingress[0].hostname`.

## Review Notes
The Calico policy examples are syntactically aligned with Calico's `projectcalico.org/v3` policy resources. The `gateway-accessible == 'true'` namespace selector assumes backend namespaces are labeled accordingly before the policy is applied. The gateway Deployment uses a specific Envoy image tag, which is acceptable, but future reviews should check whether that tag is still appropriate for security and compatibility.
