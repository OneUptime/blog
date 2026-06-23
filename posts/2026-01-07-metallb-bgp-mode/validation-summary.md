# Validation Summary: How to Configure MetalLB BGP Mode for Production Networks

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MetalLB
- Kubernetes Services
- BGP
- BFD
- FRRouting
- Cisco IOS-XE
- VyOS

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB v0.14.5 CRD manifests: https://github.com/metallb/metallb/tree/v0.14.5/config/crd/bases
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- Cisco IOS-XE BGP neighbor session documentation: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-neighbor-0.html
- VyOS BGP documentation: https://docs.vyos.io/en/rolling/configuration/protocols/bgp.html
- VyOS route-map documentation: https://docs.vyos.io/en/1.5/configuration/policy/route-map.html
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The authenticated `BGPPeer` example used `password: bgp-auth-secret`, which MetalLB interprets as a literal password string. Changed it to `passwordSecret.name: bgp-auth-secret` so it references a Kubernetes Secret as described.
- The BGP authentication Secret used `type: Opaque`. MetalLB documents `passwordSecret` secrets as `kubernetes.io/basic-auth` with the password stored under the `password` key, so the Secret type was corrected.
- The multi-router `BGPPeer` examples repeated the same authentication issue by using `password: bgp-dc1-secret` and `password: bgp-dc2-secret`. Updated them to `passwordSecret` references.
- The node selector explanation said nodes must match all selectors. MetalLB evaluates the list as matching any selector, while each selector's requirements are ANDed internally. Updated the comment.
- `BGPAdvertisement.spec.communities` referenced `Community` resource names such as `production-community`. MetalLB expects community values or alias names defined inside `Community` resources, so the examples now reference aliases such as `production`, `high-priority`, `backup-path`, and the data center aliases.
- The `no-advertise` explanation implied the route would not be advertised to any peer at all. Clarified that it prevents advertisement to any other peer by a receiving BGP speaker.
- The FRR route-map comment said local preference was set based on community, but the example did not match on a community. Updated the comment to match the actual route-map behavior.
- The VyOS example used older `set protocols bgp 64512 ...` syntax. Updated it to current VyOS syntax using `set protocols bgp system-as 64512` and unnumbered `set protocols bgp ...` paths, and added current route-map import attachment commands.
- The test Service used the legacy `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation.

## Review Notes
- All YAML code blocks parse successfully after the fixes.
- The examples still require environment-specific router support for ECMP, BFD, MD5 authentication, and accepted route-policy behavior; those operational details are correctly presented as production considerations rather than universal defaults.
