# Validation Summary: How to Set Up MetalLB as LoadBalancer in K3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes Services
- MetalLB
- Helm
- Bare-metal Kubernetes networking
- BGP

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Helm Controller: https://docs.k3s.io/add-ons/helm
- K3s Manual Upgrades: https://docs.k3s.io/upgrades/manual
- MetalLB Installation: https://metallb.io/installation/
- MetalLB Configuration: https://metallb.io/configuration/
- MetalLB Usage: https://metallb.io/usage/
- MetalLB API Reference: https://metallb.io/apis/
- MetalLB Issues with K3s: https://metallb.io/configuration/k3s/
- Kubernetes Service Documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The introduction said bare-metal K3s `LoadBalancer` Services remain pending indefinitely. That is inaccurate because K3s includes a built-in ServiceLB. I corrected the introduction to distinguish generic bare-metal Kubernetes behavior from K3s-specific behavior.
- The ServiceLB disable step did not clarify that the change must be applied on all K3s server nodes and that K3s must be restarted after editing `config.yaml`. I added both clarifications.
- The strict ARP step treated strict ARP as mandatory for MetalLB Layer 2 deployments. Per MetalLB installation guidance, it is required only when `kube-proxy` is running in IPVS mode. I updated the heading and explanation accordingly.
- The K3s `HelmChart` example pinned MetalLB to `0.14.3`, which is stale relative to current upstream documentation. I removed the fixed version so the manifest does not encode outdated version-specific guidance.
- The BGP pool example labeled `203.0.113.0/28` as a public range. That CIDR is reserved for documentation examples. I changed the comment to make it clear that it is an example placeholder.
- The test `Service` used the deprecated `spec.loadBalancerIP` example. I replaced it with the current MetalLB `metallb.io/loadBalancerIPs` annotation example.
- The pool-selection example used the legacy `metallb.universe.tf/address-pool` annotation. I updated it to the current `metallb.io/address-pool` annotation.

## Review Notes
- K3s server-side critical flags such as `--disable=servicelb` must match across all server nodes in a multi-server cluster.
- MetalLB still supports `spec.loadBalancerIP`, but Kubernetes deprecated that field in v1.24, so the annotation-based example is the safer current guidance.
- No additional technical issues were found after these corrections.
