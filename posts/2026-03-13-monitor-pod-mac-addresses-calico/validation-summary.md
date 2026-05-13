# Validation Summary: How to Monitor Pod MAC Addresses with Calico

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (CNI plugin)
- Kubernetes
- Linux veth pairs
- Proxy ARP
- `kubectl`, `ip`, `arp` CLI tools

## Sources Consulted
- Calico — Use a specific MAC address for a pod: https://docs.tigera.io/calico/latest/networking/configuring/pod-mac-address
- Calico FAQ (proxy ARP, ee:ee:ee:ee:ee:ee on cali* interfaces): https://docs.tigera.io/calico/latest/reference/faq
- Calico Felix configuration reference (`deviceRouteProtocol`): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- projectcalico/cni-plugin PR #436 — "Set MAC on host side of veth pair" (introducing ee:ee:ee:ee:ee:ee on the host side)
- projectcalico/calico PR #6249 — `cni.projectcalico.org/hwAddr` pod annotation
- tkng K8s Networking Guide — Calico CNI: https://www.tkng.io/cni/calico/

## Issues Found
1. **Incorrect side of veth pair for `ee:ee:ee:ee:ee:ee`.** The original introduction claimed Calico assigns `ee:ee:ee:ee:ee:ee` (modified with interface-specific bytes) to pod interfaces. Per the Calico FAQ and cni-plugin PR #436, this MAC is hardcoded on the **host-side** `cali*` veth, while the pod-side `eth0` receives a normal kernel-generated MAC. Rewrote the introduction to describe this correctly and to explain why Calico can safely reuse the same host-side MAC across all pods (L3-only routing with proxy ARP answering for 169.254.1.1).

2. **Bogus "Configure MAC Prefix" command.** The original section claimed you could configure the MAC prefix via `calicoctl patch felixconfiguration ... '{"spec":{"deviceRouteProtocol":80}}'`. `deviceRouteProtocol` is an 8-bit netlink route-protocol/owner label used to identify routes Felix programs into the kernel — it has nothing to do with MAC addresses. Calico exposes no cluster-wide MAC prefix setting. The correct mechanism for pinning a pod's MAC is the `cni.projectcalico.org/hwAddr` pod annotation (introduced in PR #6249). Replaced the section with this annotation example and noted that the host-side `ee:ee:ee:ee:ee:ee` is hardcoded.

3. **Incorrect mermaid diagram.** The diagram labeled the pod's `eth0` with `ee:ee:ee:xx:xx:xx` and left the host-side `cali*` veth unlabeled. Swapped this so pod `eth0` is shown with a kernel-generated MAC and the host-side `cali*` interface carries `ee:ee:ee:ee:ee:ee`.

4. **Misleading conclusion.** The original conclusion said Calico uses "deterministic assignment based on interface identifiers, ensuring unique MACs within a node," which implied the pod-side MAC was derived from `ee:ee:ee:ee:ee:ee`. Rewrote it to accurately describe the split: kernel-generated per-pod MACs on the container side, shared `ee:ee:ee:ee:ee:ee` on every host-side cali* veth, served via proxy ARP.

## Review Notes
- The `kubectl get pods -A -o wide | while read ns pod rest` loop in the "Check Pod MAC Addresses" section will iterate over the column-header line and emit one empty result before falling through (the `2>/dev/null` swallows the kubectl error). This is cosmetic, not technically incorrect, so it was left in place.
- `arp -n` is from the deprecated net-tools package; on modern distros `ip neigh show` is preferred. The post's `arp -n` form still works where net-tools is installed, so no change was made.
- The post claims compatibility with "Calico v3.20+". The `cni.projectcalico.org/hwAddr` annotation landed in Calico v3.24 (PR #6249, August 2022), so the per-pod MAC annotation example specifically requires v3.24 or later. The post's general prerequisite of v3.20+ remains accurate for the other commands shown.
