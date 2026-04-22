# Validation Summary: How to Scale NAT for Large Networks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux Netfilter connection tracking
- nftables flowtable and hardware offload
- iptables SNAT/PAT
- iproute2 ECMP routes
- Linux RSS and IRQ affinity
- sysstat monitoring tools

## Sources Consulted
- Linux Kernel Netfilter conntrack sysctl documentation: https://www.kernel.org/doc/html/v6.6/networking/nf_conntrack-sysctl.html
- Linux Kernel Netfilter flowtable documentation: https://docs.kernel.org/6.6/networking/nf_flowtable.html
- Netfilter NAT HOWTO for SNAT syntax and address ranges: https://netfilter.org/documentation/HOWTO/NAT-HOWTO-6.html
- iptables-extensions(8) man page for `SNAT --to-source`: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- ip-route(8) man page for multipath `nexthop` and `weight`: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux Kernel networking scaling documentation for RSS and IRQ distribution: https://docs.kernel.org/networking/scaling.html
- Linux Kernel SMP IRQ affinity documentation: https://www.kernel.org/doc/html/v6.9/core-api/irq/irq-affinity.html
- RFC 4787, NAT Behavioral Requirements for Unicast UDP: https://datatracker.ietf.org/doc/html/rfc4787
- RFC 2663, IP Network Address Translator terminology and considerations: https://datatracker.ietf.org/doc/rfc2663/
- Local command help for `iptables`, `ip route`, `mpstat`, and `sar`.
- Related OneUptime links in the post were opened and found to resolve to the intended articles.

## Issues Found
- The flowtable section was titled as hardware offload but the nftables example omitted `flags offload;`, which is required by the Linux kernel flowtable documentation to request NIC hardware offload. Added `flags offload;` and qualified the text with the NIC/driver support requirement.
- The flowtable explanation said it bypasses the full netfilter stack. The kernel documentation describes flowtable as bypassing the classic forwarding path, so the body and takeaway now use that more precise wording.
- The PAT section stated that a single public IP maxes out at about 65K sessions and calculated `20 IPs x 65535 ports = ~1.3M sessions`. That is an oversimplification because NAPT/PAT capacity depends on transport protocol, active mappings, and destination tuples. Updated the wording to describe source-port exhaustion for busy destination tuples and changed the comment to avoid a universal total-session claim.

## Review Notes
- The conntrack sysctls and default TCP timeout values match the Linux kernel documentation. `nf_conntrack_buckets` is only writable in the initial network namespace, so production persistence can depend on boot/module-load timing.
- Reducing `nf_conntrack_tcp_timeout_established` to 600 seconds is technically valid but can expire idle long-lived TCP sessions; production values should be chosen from observed traffic behavior.
- ECMP with stateful NAT requires flow symmetry: packets for an established translation must continue to traverse the NAT gateway that owns that state.
- Local `nft -c` validation could not complete in this environment because netlink cache initialization requires privileges not available to the process, so nftables flowtable syntax was verified against kernel documentation.
