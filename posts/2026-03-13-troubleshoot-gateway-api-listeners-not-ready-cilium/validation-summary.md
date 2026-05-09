# Validation Summary: How to Troubleshoot Gateway API Listeners That Never Become Ready in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium Gateway API support
- Kubernetes Gateway API
- Kubernetes Services and LoadBalancer provisioning
- kubectl
- jq

## Sources Consulted
- Cilium Gateway API Support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Cilium Gateway API host network mode documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/gateway-api/#host-network-mode
- Kubernetes Gateway API troubleshooting and status documentation: https://gateway-api.sigs.k8s.io/concepts/troubleshooting/
- Kubernetes Gateway API listener distinctiveness documentation: https://gateway-api.sigs.k8s.io/concepts/api-overview/#distinctiveness
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The post described the Gateway `Programmed` condition as meaning all listeners are valid and the load balancer is assigned. Gateway API and Cilium documentation define `Programmed` as configuration being programmed into the datapath; load-balancer address assignment should be checked separately. Updated the introduction and condition descriptions to separate datapath programming from external address assignment.
- The port-conflict section suggested checking Kubernetes Services on ports 80 and 443. Ordinary Services can share service ports, while Cilium's documented port-clash risk is primarily for Gateway API host network mode, where listener ports must be unique and available on the selected nodes. Updated the section to focus on host-network listener ports and to list Gateway listeners instead.
- The LoadBalancer Service lookup used the label `cilium.io/gateway-name`, but Cilium-created Gateway Services use the Gateway API label `gateway.networking.k8s.io/gateway-name`. Updated the selector accordingly.

## Review Notes
- The `kubectl create secret tls` syntax matches the official Kubernetes reference. The local environment does not have `kubectl` installed, so kubectl behavior was verified against official documentation rather than local help output.
- The jq snippets were syntax-checked locally with jq 1.7.
