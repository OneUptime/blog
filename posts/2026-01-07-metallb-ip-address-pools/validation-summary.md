# Validation Summary: How to Manage IP Address Pools in MetalLB

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- MetalLB
- Kubernetes Services of type LoadBalancer
- MetalLB IPAddressPool CRD
- MetalLB L2Advertisement and BGPAdvertisement CRDs
- kubectl
- YAML configuration

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB advanced IPAddressPool configuration: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB v0.16.1 native installation manifest: https://raw.githubusercontent.com/metallb/metallb/v0.16.1/config/manifests/metallb-native.yaml

## Issues Found
- The post used `namespaceSelectors` and `serviceSelectors` directly under `spec` in `IPAddressPool` examples. Current MetalLB defines these under `spec.serviceAllocation`, so the affected YAML examples were updated.
- The post described pool selection as "first matching" and suggested naming conventions for priority. Current MetalLB uses `serviceAllocation.priority`, with lower numbers taking precedence and equal priorities selected randomly, so the section and examples were corrected.
- The post used legacy `metallb.universe.tf/*` service annotations. The examples were updated to the current `metallb.io/address-pool`, `metallb.io/loadBalancerIPs`, and `metallb.io/allow-shared-ip` annotations from the official MetalLB docs.
- The IP sharing section omitted MetalLB's full sharing conditions and implied matching keys alone were enough. The text now includes the different-port and external traffic policy / identical pod selector requirements, and the examples request the same IP when a specific shared address is required.
- The CIDR example said a `/28` provides 16 addresses with 14 usable. MetalLB address pools can include the configured range unless excluded by options such as `avoidBuggyIPs`, so the comment was changed to simply state 16 addresses.
- One reserved-address example claimed `192.168.6.120` was skipped while the range still included it. That incorrect comment was removed.
- The BGP advertisement section did not mention that BGP peers are also required for BGP sessions. A brief caveat was added.
- The controller log command selected all pods with `app=metallb`, which can include speaker pods that do not have a `controller` container. The selector was changed to `component=controller`.

## Review Notes
The examples use `metallb.io/v1beta1` for IPAddressPool, L2Advertisement, and BGPAdvertisement, which matches the current MetalLB API reference. The post still focuses on address pool management and does not attempt to provide a complete BGP peering setup.
