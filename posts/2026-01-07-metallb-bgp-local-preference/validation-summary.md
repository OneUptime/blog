# Validation Summary: How to Configure BGP Local Preference in MetalLB

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MetalLB
- Kubernetes LoadBalancer services
- BGP
- BGP LOCAL_PREF
- BFD
- BGP communities
- ECMP
- Cisco IOS, FRRouting/Quagga, and Juniper BGP inspection commands

## Sources Consulted
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB advanced BGP configuration documentation: https://metallb.universe.tf/configuration/_advanced_bgp_configuration/
- MetalLB API reference documentation: https://metallb.universe.tf/apis/
- MetalLB BGP mode concepts: https://metallb.universe.tf/concepts/bgp/
- RFC 4271, Border Gateway Protocol 4: https://datatracker.ietf.org/doc/html/rfc4271
- RFC 5880, Bidirectional Forwarding Detection: https://datatracker.ietf.org/doc/html/rfc5880
- Kubernetes Service LoadBalancer documentation: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer

## Issues Found
- The post said local preference is configured through both BGPPeer and BGPAdvertisement. MetalLB exposes `localPref` on BGPAdvertisement, while BGPPeer defines sessions. Updated the explanation and Step 1 wording.
- The BGP peer examples used different peer ASNs, implying eBGP, while BGP LOCAL_PREF is an iBGP attribute under RFC 4271. Updated the examples to use the same AS and added an eBGP caveat recommending router import policy or MetalLB communities.
- The basic BGPPeer example contained misleading local preference comments and a shared `sourceAddress`. Removed the misleading comments and source address from the multi-node example.
- The basic BGPAdvertisement example referenced community aliases before defining a Community resource. Replaced those with literal standard community values.
- The BFD wording implied universal support. Updated it to note that MetalLB BFD support applies to FRR-based modes.
- The active-standby password example used an unclear placeholder. Updated it to show the current `passwordSecret` field shape.
- The failover verification commands checked the pool `/24` even though the examples advertise individual service `/32` routes. Updated the Cisco, FRRouting/Quagga, Juniper, and troubleshooting examples to use `192.168.100.10/32`.
- The "Weighted Load Balancing" section incorrectly implied local preference can create weighted distribution and that lower-preference paths receive overflow traffic. Reframed it as ECMP within a preferred tier plus standby lower-preference paths.
- The US West geographic example referenced BFD and community aliases defined earlier. Added a note that a separate Kubernetes cluster must also define those resources.

## Review Notes
YAML snippets were parsed successfully, and the shell script block passed `bash -n`. The examples remain topology-dependent: actual failover behavior and route display output can vary by router platform, BGP policy, ECMP settings, and whether MetalLB is running in an FRR-based mode.
