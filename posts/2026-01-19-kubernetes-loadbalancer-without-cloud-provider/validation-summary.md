# Validation Summary: How to Set Up Kubernetes LoadBalancer Services Without Cloud Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- LoadBalancer Services
- MetalLB
- kube-vip
- PureLB
- OpenELB
- BGP
- Layer 2 ARP/NDP announcements
- Prometheus Operator monitoring resources

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice deprecation note for Endpoints API: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB v0.14.5 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
- kube-vip cloud provider documentation: https://kube-vip.io/docs/usage/cloud-provider/
- kube-vip installation and flags documentation: https://kube-vip.io/docs/installation/ and https://kube-vip.io/docs/installation/flags/
- kube-vip GitHub releases/package information: https://github.com/kube-vip/kube-vip/releases and https://github.com/orgs/kube-vip/packages/container/package/kube-vip-cloud-provider
- PureLB Helm installation documentation: https://purelb.io/docs/installation/helm/
- PureLB ServiceGroup documentation: https://purelb.io/docs/configuration/service-groups/
- PureLB LBNodeAgent documentation: https://purelb.io/docs/configuration/lbnodeagent/
- PureLB migration documentation: https://purelb.io/docs/migration/
- OpenELB installation documentation: https://openelb.io/docs/getting-started/installation/install-openelb-on-kubernetes/
- OpenELB Eip documentation: https://openelb.io/docs/getting-started/configuration/configure-ip-address-pools-using-eip/

## Issues Found
- MetalLB Layer 2 was described as working in any network environment. Updated the wording to clarify that Layer 2 mode requires local Layer 2 reachability.
- MetalLB `BGPPeer` used deprecated `metallb.io/v1beta1`. Updated it to `metallb.io/v1beta2`.
- kube-vip instructions omitted the cloud provider install command and referenced old image tags. Added the official cloud-provider manifest apply command and updated the cloud provider image to `v0.0.12` and kube-vip image to `v1.0.4`.
- PureLB examples used the older GitLab Helm repository, `purelb` namespace, `purelb.io/v1`, and v1 field names. Updated them to the current `https://purelb.io/charts` repository, `purelb-system` namespace, `purelb.io/v2`, `localInterface`, and `dummyInterface`.
- OpenELB was described as an OpenStack-oriented solution. Updated it to match OpenELB's documented bare metal, edge, and private-environment positioning, and changed the install command to the stable `release-0.6` manifest path.
- The comparison table incorrectly showed PureLB as not supporting BGP. Updated PureLB BGP support to yes for current PureLB with k8gobgp.
- MetalLB examples used old `metallb.universe.tf` annotations. Updated them to current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The post recommended `spec.loadBalancerIP` as a Kubernetes 1.24+ standard field. Updated the comment to note that `spec.loadBalancerIP` is deprecated in Kubernetes 1.24+ and that the MetalLB annotation should be preferred for new manifests.
- The MetalLB monitoring example used a `ServiceMonitor` selector and port that do not match the native MetalLB manifest. Converted the example to a `PodMonitor` using the `app: metallb` selector and `monitoring` pod port.
- Troubleshooting used a broad MetalLB controller log selector and the deprecated Endpoints API. Narrowed the log selector to the controller component and changed the endpoint check to EndpointSlices.

## Review Notes
The post is technically relevant and valid after the corrections. Several examples are version-sensitive; future updates should re-check pinned component versions and CRD API versions before publication.
