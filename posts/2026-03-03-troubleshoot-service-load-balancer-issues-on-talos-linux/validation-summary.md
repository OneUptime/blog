# Validation Summary: How to Troubleshoot Service Load Balancer Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- Kubernetes EndpointSlices
- MetalLB
- kube-vip / Talos VIP
- kube-proxy
- NodePort
- BGP and Layer 2 service advertisement

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB usage documentation for traffic policies: https://metallb.io/usage/index.html
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- Talos Linux VIP documentation: https://www.talos.dev/v1.10/talos-guides/network/vip/

## Issues Found
- The MetalLB installation command used `v0.14.3`, while the current official MetalLB installation documentation points to `v0.15.3`. Updated the manifest URL to `v0.15.3`.
- The traffic troubleshooting section used the deprecated Kubernetes `Endpoints` API. Kubernetes v1.33 marks Endpoints as deprecated and recommends EndpointSlices, so the command and surrounding text were updated to use `kubectl get endpointslice`.
- The Layer 2 troubleshooting section suggested grepping MetalLB speaker logs to identify the advertising node. MetalLB troubleshooting documentation says `kubectl describe svc` shows service events, including which speaker is announcing the service, so the command was updated accordingly.

## Review Notes
The remaining examples and explanations are technically consistent with official Kubernetes, MetalLB, and Talos documentation. The post still uses general troubleshooting commands and examples, so users may need to adjust namespaces, selectors, ports, and interface names for their own clusters.
