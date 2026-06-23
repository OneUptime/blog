# Validation Summary: How to Configure BGP for IPv6 with MetalLB

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough)

## Technologies Covered
- MetalLB (v0.14.9, CRD-based configuration)
- BGP (Border Gateway Protocol)
- IPv6 / dual-stack networking
- Kubernetes (Services, LoadBalancer, ipFamilyPolicy)
- BFD (Bidirectional Forwarding Detection)
- FRRouting (FRR), Cisco IOS-XE, Juniper JunOS router configuration
- Prometheus / ServiceMonitor

## Sources Consulted
- MetalLB installation docs — https://metallb.universe.tf/installation/ (native vs. FRR vs. FRR-K8s backends)
- MetalLB BGP concepts — https://metallb.universe.tf/concepts/bgp/ (BFD and IPv6 BGP only available with FRR/FRR-K8s)
- MetalLB advanced BGP configuration & API reference — https://metallb.io/configuration/_advanced_bgp_configuration/ and https://metallb.io/apis/ (BGPPeer / BFDProfile / Community / BGPAdvertisement fields)
- MetalLB v0.14.9 release & manifest directory — https://github.com/metallb/metallb/releases/tag/v0.14.9 and https://github.com/metallb/metallb/tree/v0.14.9/config/manifests (confirmed metallb-native.yaml, metallb-frr.yaml, metallb-frr-k8s.yaml all exist)
- Well-known BGP community values (NO_EXPORT 65535:65281, NO_ADVERTISE 65535:65282) and BFD/BGP port assignments (TCP 179, UDP 3784/3785)

## Issues Found
1. **Wrong MetalLB backend installed (critical).** The post installed `metallb-native.yaml`, but the native BGP backend supports **neither IPv6 BGP nor BFD** — both are central to the entire post. Per MetalLB docs, an FRR-based backend is required. Changed the install command to `metallb-frr-k8s.yaml` (the current recommended FRR-K8s backend, which provides BGP with BFD support and IPv6) and added a sentence/comment explaining that the native backend does not support IPv6 BGP or BFD. All of the post's CRDs (BGPPeer, BFDProfile, BGPAdvertisement, Community, IPAddressPool) continue to work unchanged under this backend.

2. **`ebgpMultiHop` mislabeled as GTSM.** A "Security Hardening" bullet titled "Enable BGP TTL Security Hack (GTSM)" used `ebgpMultiHop: true  # Set to actual hop count`. This is incorrect on two counts: `ebgpMultiHop` is the opposite of GTSM (it permits multi-hop eBGP rather than enforcing TTL security), and the field is a boolean, not a hop count — MetalLB's BGPPeer has no GTSM/hop-count option. Rewrote the bullet to correctly describe `ebgpMultiHop` as a boolean to enable multi-hop eBGP only when the peer is not directly connected, and corrected the comment.

3. **FRR `no ipv6 forwarding` on a forwarding border router.** The FRRouting example for the upstream border router included `no ipv6 forwarding`, which disables IPv6 forwarding and would break the data path to the advertised LoadBalancer prefixes. Changed it to `ipv6 forwarding`.

## Review Notes
- The remaining MetalLB CRD fields and API versions are correct: `metallb.io/v1beta1` for IPAddressPool/BGPAdvertisement/BFDProfile/Community and `metallb.io/v1beta2` for BGPPeer; field names (`myASN`, `peerASN`, `peerAddress`, `bfdProfile`, `holdTime`/`keepaliveTime` durations, `nodeSelectors`, `aggregationLength`/`aggregationLengthV6`, `localPref`, `communities`) all match the API.
- BFDProfile values (`receiveInterval`/`transmitInterval` in ms, `detectMultiplier`, `minimumTtl`) and the ~900 ms detection math are accurate.
- Well-known community values, private ASN range (64512–65534), prefix-size math (/120 = 256, /112 = 65,536, /64 ≈ 1.8×10^19), and port numbers (TCP 179, UDP 3784/3785) are all correct.
- Router-side examples (Cisco IOS-XE `fall-over bfd`, Juniper `bfd-liveness-detection`, FRR route-maps/prefix-lists) are syntactically reasonable.
- Minor, not changed: the sample `kubectl get pods` output shows only controller + speakers; with the FRR-K8s backend additional `frr-k8s` pods also run in `metallb-system`. The shown speaker pods remain `1/1` under FRR-K8s mode (unlike the legacy FRR sidecar mode), so the illustrative output is still accurate for the components listed.
