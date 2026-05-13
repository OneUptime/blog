# Validation Summary: How to Optimize Pod MAC Addresses with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico CNI (v3.20+)
- Kubernetes
- Linux veth pairs and ARP
- `kubectl`, `calicoctl`, `ip`, `arp`
- Mermaid diagrams

## Sources Consulted
- [Calico FAQ — host-side veth MAC `ee:ee:ee:ee:ee:ee`](https://docs.tigera.io/calico/latest/reference/faq)
- [projectcalico/cni-plugin PR #436 — "Set MAC on host side of veth pair"](https://github.com/projectcalico/cni-plugin/pull/436)
- [projectcalico/calico PR #6249 — pod annotation for veth MAC](https://github.com/projectcalico/calico/pull/6249)
- [Calico Cloud docs — "Use a specific MAC address for a pod" (`cni.projectcalico.org/hwAddr`)](https://docs.tigera.io/calico-cloud/networking/configuring/pod-mac-address)
- [Calico Felix configuration reference — `deviceRouteProtocol`](https://docs.tigera.io/calico/latest/reference/resources/felixconfig)
- [Calico FelixConfiguration CRD schema](https://github.com/projectcalico/calico/blob/master/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml)

## Issues Found
1. **Intro misdescribed Calico's MAC scheme.** Original text claimed the host-side MAC `ee:ee:ee:ee:ee:ee` is "modified with interface-specific bytes". In reality, Calico hardcodes the same `ee:ee:ee:ee:ee:ee` on every `cali*` host-side veth (intentional — point-to-point L3 routing means the MAC is unused for forwarding). The pod-side `eth0` MAC is kernel-generated unless overridden. Rewrote the paragraph to reflect this.
2. **"Configure MAC Prefix" command was wrong.** The `calicoctl patch felixconfiguration ... '{"spec":{"deviceRouteProtocol":80}}'` command does not configure MAC addressing at all — `deviceRouteProtocol` is the 8-bit protocol identifier Felix tags onto the routes it programs (default `RTPROT_BOOT`), used so Felix can recognize its own routes. There is no MAC-prefix field in `FelixConfiguration`; the host-side MAC is hardcoded in the CNI plugin. Replaced the snippet with the actual supported mechanism: the per-pod annotation `cni.projectcalico.org/hwAddr`, which assigns a specific MAC to the container-side veth (added in Calico via PR #6249).
3. **Mermaid diagram labeled the MAC on the wrong side.** Original showed `eth0\nee:ee:ee:xx:xx:xx` inside the Pod box and a plain "host side of veth pair" label on the node side. The `ee:ee:ee:ee:ee:ee` MAC actually lives on the host-side `cali*` interface, not the pod's `eth0`. Swapped the labels so the pod side shows "kernel-generated MAC" and the node side shows `ee:ee:ee:ee:ee:ee`.
4. **Conclusion repeated the same intro error.** It claimed Calico uses "deterministic assignment based on interface identifiers, ensuring unique MACs within a node," which is the opposite of what actually happens on the host side (identical MAC across all veths). Rewrote to match the corrected technical description.

## Review Notes
- The `arp` command in the conflict-check snippet is from `net-tools` and has been deprecated in favor of `ip neigh` on most modern distributions, but is still functional where installed. Left as-is.
- The `kubectl get pods` loop in "Check Pod MAC Addresses" has cosmetic extra whitespace before `grep -oP`, but it is functionally correct (whitespace is irrelevant inside a pipeline). Left untouched.
- `ip link | grep -A1 cali` works but is fragile — `ip -br link show 'cali*'` would be cleaner. Not a correctness issue.
- Prerequisites say "Calico v3.20+"; the `cni.projectcalico.org/hwAddr` annotation merged via PR #6249 lands in Calico v3.25+. Operators on the lower end of the stated version range may need to upgrade to use the new MAC-prefix workflow.
