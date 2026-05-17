# Validation Summary: How to Configure GRE Tunnels on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical How-To Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- GRE (Generic Routing Encapsulation) — RFC 2784
- GREtap (Layer 2 GRE)
- IP6GRE (GRE over IPv6)
- IPSec (mentioned for encrypted GRE)
- iproute2 (`ip tunnel`, `ip link`, `ip addr`, `ip route`)
- Kubernetes DaemonSets, ConfigMaps, hostNetwork, NET_ADMIN capability
- Linux sysctls (`net.ipv4.ip_forward`, `rp_filter`, `icmp_ratelimit`)
- `kubectl debug node`
- nicolaka/netshoot debug image
- tcpdump

## Sources Consulted
- RFC 2784 — Generic Routing Encapsulation (https://www.rfc-editor.org/rfc/rfc2784)
- iproute2 man pages: `ip-tunnel(8)`, `ip-link(8)` (https://man7.org/linux/man-pages/man8/ip-tunnel.8.html, https://man7.org/linux/man-pages/man8/ip-link.8.html)
- iproute2 source (`ip/iptunnel.c`, `ip/ip6tunnel.c`, `ip/link_gre6.c`) — confirms `mode ip6gre` is only valid under `ip -6 tunnel` or `ip link ... type ip6gre`, not under plain `ip tunnel`
- Linux kernel network sysctl documentation (https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt) — verified `icmp_ratelimit` exists and 0 disables rate limiting
- Talos Linux machine configuration reference (https://www.talos.dev/latest/reference/configuration/v1alpha1/config/) — verified `machine.sysctls` format and that sysctl values are strings
- Kubernetes documentation for DaemonSets, hostNetwork, securityContext, and `kubectl debug node` (https://kubernetes.io/docs/)
- nicolaka/netshoot docs (https://github.com/nicolaka/netshoot)

## Issues Found

1. **Incorrect IP6GRE command syntax (fixed).** The post originally used `ip tunnel add gre6-1 mode ip6gre ...`. The `ip tunnel` command in iproute2 (without `-6`) only handles IPv4-transport tunnel modes (ipip, gre, sit, isatap, vti); passing `mode ip6gre` to it returns `Unknown tunnel mode`. The supported forms are `ip -6 tunnel add ... mode ip6gre` or `ip link add ... type ip6gre`. Changed to `ip link add gre6-1 type ip6gre ...`, which is the modern, canonical form and parallels the `gretap` example in the same section.

## Review Notes

- GRE protocol number (47), 24-byte overhead (20-byte outer IPv4 + 4-byte minimal GRE header), and 1476-byte MTU calculation (1500 − 24) are all correct.
- The `ping -M do -s 1448` MTU probe size is correct: 1448 (payload) + 8 (ICMP) + 20 (IP) = 1476.
- `ip tunnel add ... mode gre` (IPv4 transport) and `ip link add ... type gretap` (Layer 2) are both valid syntactically; modern iproute2 also accepts `ip link add ... type gre` as an equivalent for plain GRE.
- The `ttl` keyword is accepted as a synonym for `hoplimit` on IPv6 tunnels by iproute2, so the `ttl 255` on the (now corrected) `ip link add ... type ip6gre` example is valid.
- The `machine.sysctls` block in Talos uses string values for all sysctls, which the post correctly does (`"1"`, `"0"`).
- The comment "Increase ICMP rate for path MTU discovery" is mildly imprecise — `icmp_ratelimit: "0"` disables rate limiting rather than "increasing the rate" — but the intent and effect are correct, so no change made.
- The `rp_filter` sysctls are applied to `all`/`default` rather than a specific tunnel interface; this is broader than the inline comment ("on tunnel interfaces") implies, but it is a common and working configuration for GRE tunnels and was left as-is.
- `hostname -I` in the init container relies on the netshoot image having the util-linux `hostname` (BusyBox's hostname does not implement `-I`). netshoot bundles util-linux/nettools so this works in practice; no change required.
- The DaemonSet pattern uses an initContainer to set up the tunnel and a long-running container that only monitors; if the tunnel is torn down outside the pod lifecycle there is no automatic recreation. The post acknowledges this with the `# Trigger recreation logic here` comment.
