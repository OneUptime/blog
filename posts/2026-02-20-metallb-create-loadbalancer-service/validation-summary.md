# Validation Summary: How to Create a LoadBalancer Service with MetalLB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- Kubernetes Deployments
- kubectl
- MetalLB
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- nginx container image

## Sources Consulted
- MetalLB Installation documentation: https://metallb.io/installation/
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB Usage documentation: https://metallb.io/usage/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes external LoadBalancer task: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The quick-install command pinned MetalLB `v0.14.9`, while the current official manifest documentation uses `v0.16.0`. Updated the manifest URL to `v0.16.0`.
- The MetalLB installation caveat for kube-proxy IPVS mode was missing. Added a note that strict ARP must be enabled before using Layer 2 mode with IPVS.
- The architecture and sequence diagrams implied that the MetalLB speaker forwards application traffic. Updated the diagrams to show the speaker advertising the IP and kube-proxy handling forwarding to Service endpoints.
- The multi-port Service example selected the tutorial's nginx pods but exposed HTTPS on target port 443, which those pods do not serve by default. Added a comment clarifying that selected pods must listen on both target ports.

## Review Notes
The Kubernetes `Service`, `Deployment`, MetalLB `IPAddressPool`, and MetalLB `L2Advertisement` examples use valid current APIs. `kubectl` was not installed in the local environment, so CLI syntax was checked against official Kubernetes command references instead of local `--help` output.
