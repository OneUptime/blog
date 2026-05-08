# Validation Summary: How to Configure Windows Container Networking with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Services, Ingress, and NetworkPolicy
- Windows containers on Kubernetes
- Windows container networking and HNS
- CNI plugins for Windows
- ingress-nginx
- Azure Kubernetes Service LoadBalancer annotations

## Sources Consulted
- Kubernetes Windows networking documentation: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes Windows containers compatibility and limitations: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes well-known labels and annotations: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- AKS Standard Load Balancer annotations documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Azure Kubernetes network policies documentation: https://learn.microsoft.com/en-us/azure/virtual-network/kubernetes-network-policies
- Antrea Windows documentation: https://antrea.io/docs/main/docs/windows/
- Antrea network policy documentation: https://antrea.io/docs/v1.5.0/docs/antrea-network-policy/
- Calico network policy documentation: https://docs.tigera.io/calico/latest/about/about-network-policy

## Issues Found
- The post described Windows host networking as supported with limitations. Current Kubernetes documentation says host networking mode is not supported for Windows pods, so the wording and command comments were corrected.
- The post said Windows NodePort uses `winproxy` for load balancing. Current Kubernetes documentation describes Windows Service support through kube-proxy and documents the specific limitation that local NodePort access from the node itself is unsupported, so the claim was replaced with that limitation.
- The post said IPv6 dual-stack has limited support on Windows containers. Kubernetes documents IPv4/IPv6 dual-stack support while also noting that IPv6 communication between Windows pods connected to overlay networks is unsupported, so the statement was made more precise.
- The post stated that Windows NetworkPolicy requires Calico or Antrea. Azure documentation also documents Azure Network Policy Manager support for Windows Server with HNS ACLPolicies, so AKS/Azure NPM was added where the policy engine requirement is discussed.
- The Ingress example included the deprecated `kubernetes.io/ingress.class` annotation while also using `spec.ingressClassName`. The deprecated annotation was removed and the current field was kept.

## Review Notes
The Kubernetes, Flux, ingress-nginx, NetworkPolicy, Service, and AKS LoadBalancer YAML examples are syntactically valid for the documented APIs. The Flux `dependsOn` example is valid, but it only waits for other Flux Kustomizations to be ready; if stronger readiness semantics are needed, the referenced Kustomizations should use `wait` or health checks.
