# Validation Summary: How to Understand BFD and Graceful Restart Compatibility in MetalLB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB `BGPPeer` and `BFDProfile` CRDs
- BGP
- BFD
- BGP graceful restart
- FRRouting
- Cisco IOS BGP configuration
- Arista EOS BGP configuration
- Junos OS BGP/BFD behavior

## Sources Consulted
- MetalLB Advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/index.html
- RFC 5882, Generic Application of BFD: https://www.rfc-editor.org/rfc/rfc5882.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting BFD documentation: https://docs.frrouting.org/en/stable-10.2/bfd.html
- Cisco IOS BGP command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Arista EOS BGP documentation: https://www.arista.com/en/um-eos/eos-border-gateway-protocol-bgp
- Juniper BFD for BGP Sessions: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/bfd-for-bgp-session.html
- Juniper graceful restart configuration: https://www.juniper.net/documentation/us/en/software/junos/high-availability/topics/task/graceful-restart-for-routing-protocols-configuring.html
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl exec` reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said MetalLB does not expose a dedicated graceful restart field in `BGPPeer` and that the FRR backend enables graceful restart by default. MetalLB documentation now exposes `enableGracefulRestart` on `BGPPeer`, so the post was updated to use that field and mark it in the `BGPPeer` examples.
- The post implied BFD timers can be tuned so BFD only triggers on real failures, not planned restarts. RFC 5882 and MetalLB documentation describe BFD plus graceful restart behavior as implementation-specific, so the wording was changed to recommend testing vendor behavior and to avoid claiming timers can reliably distinguish planned restarts.
- The Cisco IOS example enabled plain `fall-over bfd` while discussing graceful restart compatibility. Cisco documents `check-control-plane-failure` for BFD interaction with BGP GR/NSF, so the example was updated to include it.
- The FRRouting example used plain `neighbor ... bfd`. FRRouting documents `neighbor ... bfd check-control-plane-failure` for ignoring BFD down events while graceful restart keeps stale routes, so the example was updated.
- The FRR verification command used `show bgp neighbor`. FRR documents the graceful restart form as `show bgp neighbors <peer> graceful-restart`, so the verification and troubleshooting commands were updated.
- The vendor behavior matrix made overly specific claims about Cisco IOS-XR, Junos, Arista EOS, and FRRouting defaults. These were softened or corrected to reflect documented implementation-specific behavior, Juniper's caution against combining BFD and GR on the same device, and FRR's documented BFD-to-BGP shutdown behavior unless control-plane failure handling is configured.
- The Arista section included an unsupported-looking `no neighbor ... bfd check-control-plane-failure` command. It was replaced with a baseline EOS neighbor configuration and a note to verify BFD/GR behavior for the exact EOS version.

## Review Notes
The `BFDProfile` and `BGPPeer` YAML fields match MetalLB's current API documentation. The `kubectl` commands are syntactically consistent with Kubernetes reference docs, but `kubectl` is not installed in this workspace, so local CLI help output could not be checked.
