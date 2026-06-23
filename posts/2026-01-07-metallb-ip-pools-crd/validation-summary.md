# Validation Summary: How to Manage MetalLB IP Pools with Custom Resource Definitions

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- Kubernetes Custom Resource Definitions and custom resources
- MetalLB IPAddressPool
- MetalLB L2Advertisement
- Prometheus Operator ServiceMonitor

## Sources Consulted
- MetalLB official documentation: https://metallb.io/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB advanced L2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer
- Kubernetes dual-stack Service documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/#services
- MetalLB v0.16.1 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml

## Issues Found
- The MetalLB manifest installation command used `v0.14.8`, while the current official installation documentation references `v0.16.1`. Updated the manifest URL to `v0.16.1`.
- The prerequisites said administrative access was needed to create CRDs. Configuration creates MetalLB custom resources; CRDs are installed with MetalLB. Clarified the wording.
- The IPv6 section said MetalLB fully supports IPv6 without caveat. Updated it to note that IPv6 is supported in Layer 2 mode and in BGP mode with FRR-based backends.
- The heading "Avoid Bug Share Key" was incorrect. Changed it to "Avoid Buggy IPs".
- Several Service examples used the legacy `metallb.universe.tf/*` annotation prefix. Updated them to the current documented `metallb.io/*` annotations.
- Several examples described or implied higher numeric `serviceAllocation.priority` values as higher priority. MetalLB uses lower numbers as higher priority, with unset or `0` as lowest priority. Adjusted the priority examples accordingly.
- The metrics list included `metallb_layer2_requests_received`, which is not listed in the current official MetalLB metrics documentation. Replaced it with `metallb_k8s_client_config_stale_bool`, which is documented.
- The ServiceMonitor example used a `monitoring` port that does not match the current MetalLB manifest service port. Updated it to `metricshttps` and added HTTPS scheme/TLS settings.
- The additional resource links used the old `metallb.universe.tf` documentation URLs. Updated them to the current `metallb.io` URLs.

## Review Notes
The post is technically relevant and the core CRD examples use current `metallb.io/v1beta1` APIs for IPAddressPool and L2Advertisement. The `spec.loadBalancerIP` example remains in the article because it is still supported by MetalLB, but the post correctly labels it as deprecated and recommends the MetalLB annotation instead.
