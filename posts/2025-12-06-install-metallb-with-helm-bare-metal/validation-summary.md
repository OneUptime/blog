# Validation Summary: How to Install MetalLB with Helm on Bare-Metal Kubernetes (and Actually Use It)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services and LoadBalancer networking
- MetalLB 0.14.7
- MetalLB Layer 2 and BGP configuration
- Helm
- kubectl
- Prometheus metrics

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB v0.14.7 installation documentation: https://raw.githubusercontent.com/metallb/metallb/v0.14.7/website/content/installation/_index.md
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB v0.14.7 Helm chart values: https://raw.githubusercontent.com/metallb/metallb/v0.14.7/charts/metallb/values.yaml
- MetalLB v0.14.7 CRD schemas: https://raw.githubusercontent.com/metallb/metallb/v0.14.7/config/crd/bases/metallb.io_bgppeers.yaml and https://raw.githubusercontent.com/metallb/metallb/v0.14.7/config/crd/bases/metallb.io_bgpadvertisements.yaml
- MetalLB v0.14.7 usage documentation: https://raw.githubusercontent.com/metallb/metallb/v0.14.7/website/content/usage/_index.md
- MetalLB v0.14.7 Prometheus metrics documentation: https://raw.githubusercontent.com/metallb/metallb/v0.14.7/website/content/prometheus-metrics/_index.md
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post showed `ipAddressPools`, `l2Advertisements`, `bgpPeers`, and `bgpAdvertisements` as Helm values for the pinned `metallb/metallb` chart version `0.14.7`. The official `v0.14.7` chart values do not define those keys, so Helm would not create the MetalLB configuration resources from that file. I changed the examples to normal `IPAddressPool`, `L2Advertisement`, `BGPPeer`, and `BGPAdvertisement` manifests applied with `kubectl apply`.
- The Helm command placed an inline comment after a line-continuation backslash, which would break the shell command and cause `-f values-metallb.yaml` to be interpreted incorrectly. I removed the inline continuation comment and separated the config apply step.
- The install flow did not label the namespace for privileged pod security admission. MetalLB's official installation docs note that speaker pods need elevated permissions, so I added the required namespace labels before installing.
- Several `kubectl get` commands for MetalLB CRs omitted the `metallb-system` namespace even though the resources are namespaced. I added `-n metallb-system`.
- The BGP verification steps implied that `kubectl describe BGPPeer` would show established session state. MetalLB's troubleshooting docs point to BGP metrics or FRR/native speaker inspection for session state, so I changed the check to query the FRR container used by the pinned chart.
- The post recommended `spec.loadBalancerIP` for static VIPs. Kubernetes has deprecated that field since v1.24, and MetalLB `0.14.7` supports the implementation-specific `metallb.universe.tf/loadBalancerIPs` annotation, so I updated the recommendation.
- The Prometheus metric names `metallb_controller_reallocate_total` and `metallb_controller_allocations{}` are not listed in the official MetalLB `0.14.7` metrics documentation. I replaced them with `metallb_allocator_addresses_in_use_total` and generalized the conflict-watch guidance.

## Review Notes
The post pins MetalLB `0.14.7`, so the validation used that release's chart values, CRDs, usage docs, and metrics docs rather than only the latest MetalLB documentation. Future updates could move the annotation examples to the newer `metallb.io/*` annotation prefix if the article also updates the pinned MetalLB version.
