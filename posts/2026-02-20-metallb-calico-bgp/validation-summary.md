# Validation Summary: How to Use MetalLB Alongside Calico BGP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- Calico
- BGP
- VXLAN
- FRRouting

## Sources Consulted
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico calicoctl node command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB BGP concepts documentation: https://metallb.io/concepts/bgp/

## Issues Found
- The MetalLB IPAddressPool range was `192.168.1.200-192.168.1.210`, but the Calico `serviceLoadBalancerIPs` CIDR was `192.168.1.200/29`, which only covers `192.168.1.200-192.168.1.207`. Changed the MetalLB pool to `192.168.1.200-192.168.1.207` so Calico advertises the full allocation range.
- The MetalLB IPAddressPool comment said not to auto-assign while `autoAssign: true` was set. Updated the comment to match MetalLB behavior.
- The post said MetalLB assigns Kubernetes `ExternalIPs`. MetalLB assigns LoadBalancer service IPs from configured pools, while `ExternalIPs` are a separate Kubernetes Service field. Updated the comment to say `serviceExternalIPs` is for environments that use Service ExternalIPs.
- The post referred to "L2 mode only" while the example intentionally omitted MetalLB advertisement resources. Updated the heading and text to describe MetalLB IP allocation-only mode and clarified not to create either `BGPAdvertisement` or `L2Advertisement` for Option 1.
- The split-BGP guidance implied that different AS numbers alone could avoid conflicts. Updated the wording to require distinct, router-supported BGP sessions using separate routers, interfaces, or accepted source addresses.
- The VXLAN option implied that changing only the IPPool disables Calico BGP. Calico documentation says VXLAN pools mean BGP is not required, but manifest-based installs should also set `calico_backend` to `vxlan` and disable the BGP readiness check. Updated the text accordingly.
- The route-verification example said service IPs should be seen from MetalLB even in the Calico-advertisement option. Updated it to say service IPs should be seen from whichever component advertises them.
- The "Common Mistakes" section overstated AS-number and port-conflict rules. Reworded these items to focus on distinct supported BGP peers and matching TCP port configuration.

## Review Notes
The commands and CRD examples otherwise match current Calico and MetalLB documentation. The `kubectl exec` example for `birdcl` may need namespace or container-name adjustment depending on how Calico was installed, but `calicoctl node status` is the documented general-purpose check.
