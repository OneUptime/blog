# Validation Summary: How to Configure VIP Across Multiple Subnets in Talos Linux

## Status
validated

## Post Type
Guide / Explainer (limitations + alternatives)

## Technologies Covered
- Talos Linux (machine config: `interfaces`, `vlans`, `vip`, `kubespan`, `cluster.controlPlane.endpoint`)
- Kubernetes control plane / API server HA
- Gratuitous ARP / Layer 2 networking
- HAProxy (TCP load balancing)
- Nginx Stream module
- DNS round-robin
- KubeSpan (WireGuard mesh)
- BGP anycast

## Sources Consulted
- Talos v1.7 configuration reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos VIP networking guide: https://docs.siderolabs.com/talos/v1.7/networking/vip/
- Talos KubeSpan guide: https://docs.siderolabs.com/talos/v1.8/networking/kubespan/
- Talos `DeviceVIPConfig` and `Vlan` type definitions
- HAProxy TCP mode and Nginx stream module documentation (general knowledge cross-check)

## Issues Found

1. **Incorrect VLAN schema in Alternative 4.** The original config used `interface: eth0.100` with a single `vlan: { vlanId: 100 }` field at the interface level. This is not the Talos schema — Talos configures VLANs as a `vlans:` array nested under a parent physical interface (`interface: eth0`), with the `vip` attached to the VLAN sub-entry. Fixed all three node examples to use the correct nested-array schema (`interface: eth0` → `vlans: [{ vlanId: 100, addresses: [...], vip: { ip: ... } }]`).

2. **Incorrect claim that KubeSpan provides a virtual Layer 2 network enabling VIP across subnets.** KubeSpan is a WireGuard mesh and operates at Layer 3; it cannot carry gratuitous ARP broadcasts, so the native Talos VIP does not work across the mesh. Rewrote "Alternative 3" to make this explicit: KubeSpan is useful for encrypted intra-cluster connectivity across subnets but must be combined with an external LB, DNS, or BGP for API-server HA. Also added the recommended companion setting `cluster.discovery.enabled: true`. Updated the comparison-table row to reflect the corrected positioning.

3. **Incorrect loopback-interface YAML in Alternative 5 (BGP Anycast).** Talos `machine.network.interfaces` does not support attaching addresses to `interface: lo`. Replaced the unworkable YAML with an accurate note that in Talos the anycast address is typically advertised by a BGP speaker running on the cluster (e.g., kube-vip BGP mode or MetalLB) and showed the correct change — pointing `cluster.controlPlane.endpoint` at the anycast address.

## Review Notes
- The core technical premise — that Talos's built-in VIP relies on gratuitous ARP and therefore cannot span subnets — is correct and well explained.
- The HAProxy and Nginx Stream snippets are syntactically valid and reflect standard L4 proxying patterns.
- The DNS round-robin section's caveats (TTL behaviour, client-side caching, lack of native health checks) are accurate.
- ASCII network diagrams are illustrative; minor cosmetic misalignment in the first diagram was left in place since it does not affect technical correctness.
- The BGP-anycast section is necessarily high-level; readers implementing it should consult kube-vip or MetalLB documentation for the BGP peering details that are out of scope for this post.
