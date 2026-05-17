# Validation Summary: How to Configure Accept Routing on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config / `machine.sysctls`)
- Linux kernel networking sysctls (`accept_local`, `rp_filter`, `arp_announce`, `arp_ignore`, `ip_forward`, IPv6 `accept_ra`/`forwarding`)
- `talosctl` CLI (`apply-config`, `get machinestatus`, `reboot`, `read`)
- MetalLB (L2 and BGP modes, DSR concepts)
- CNI plugins (Cilium, Calico)
- Kubernetes (`kubectl`, LoadBalancer services)

## Sources Consulted
- Linux kernel IP sysctl docs — https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Talos v1alpha1 config reference (`machine.sysctls`) — https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos CLI reference — https://www.talos.dev/latest/reference/cli/
- MetalLB Installation docs (strictARP / ARP sysctl background) — https://metallb.universe.tf/installation/
- RFC 3704 (Ingress Filtering / `rp_filter` modes)

## Issues Found
- **Linux host model description (reversed)**: The "What Is Accept Routing?" section originally claimed that Linux defaults to a "strong host model" and that enabling accept routing switches it to a "weak host model." This is backwards: Linux IPv4 implements a weak host model by default — packets destined for any local IP are accepted on any interface regardless of which one they arrived on. The real reason multi-homed and load-balancing setups need sysctl tuning is reverse path filtering (`rp_filter`) and default ARP behavior, not the host model. Rewrote the paragraph to describe the weak-host default accurately and frame the sysctls (`accept_local`, `rp_filter`, `arp_announce`, `arp_ignore`) as the actual knobs being tuned.

## Review Notes
- "Accept routing" is the author's colloquial umbrella term for the set of sysctls discussed; it is not an official kernel feature name. The post's framing is fine as long as the technical claims about the underlying sysctls are accurate (which they now are after the host-model fix).
- The MetalLB ARP sysctl values (`arp_ignore=1`, `arp_announce=2`) are correct community/practical guidance and are what MetalLB's recommended `strictARP: true` kube-proxy setting ultimately configures. MetalLB's official docs themselves recommend `strictARP: true` rather than directly editing these sysctls, but the post's recommendations match the underlying behavior, so no change was needed.
- `net.ipv6.conf.all.accept_local` is not present in mainline kernel docs as a documented equivalent of the IPv4 sysctl, so the post's claim that "IPv6 does not have an exact equivalent of `accept_local`" is accurate.
- All `talosctl` commands shown (`apply-config --nodes/--file`, `get machinestatus`, `reboot`, `read`) are valid.
- `machine.sysctls` is a `map[string]string` in Talos, and per-interface keys like `net.ipv4.conf.eth0.accept_local` are passed straight through to the kernel — both confirmed against the Talos config reference.
- Version-specific caveat: per-interface sysctls assume the interface name (`eth0`, `eth1`) actually exists on the node; Talos uses predictable interface names which can vary by hardware/platform. Worth keeping in mind but not a correctness issue with the post.
