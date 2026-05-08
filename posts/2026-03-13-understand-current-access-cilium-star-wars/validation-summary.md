# Validation Summary: Understanding Current Access in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- Cilium
- CiliumNetworkPolicy
- kubectl
- curl

## Sources Consulted
- Kubernetes documentation: Services, Load Balancing, and Networking - https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl reference: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium documentation: Getting Started with the Star Wars Demo - https://docs.cilium.io/en/stable/gettingstarted/demo/

## Issues Found
- The post said all deny rules must be explicitly created. Kubernetes NetworkPolicy is an allow-list isolation API rather than a general explicit-deny rule system, so this was changed to say isolation must be explicitly created with network policies.
- The post said all four access-test commands return success. In the Cilium Star Wars demo, `PUT /v1/exhaust-port` reaches the dangerous endpoint and triggers the demo application's failure behavior rather than returning the same kind of successful response as `POST /v1/request-landing`, so this was clarified.

## Review Notes
The command syntax for `kubectl exec`, `kubectl get networkpolicies`, `kubectl get ciliumnetworkpolicies`, curl usage in the Cilium demo, pod IP lookup via JSONPath, and the default Kubernetes pod connectivity explanation were verified against official documentation.
