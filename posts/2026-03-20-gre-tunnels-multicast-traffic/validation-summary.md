# Validation Summary: How to Use GRE Tunnels for Multicast Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- GRE tunnels on Linux
- IPv4 multicast
- IGMP
- PIM-SM with FRR
- SMCRoute
- `iproute2`
- `iperf` / multicast test tooling
- Python socket multicast group joins

## Sources Consulted
- RFC 2784: Generic Routing Encapsulation (GRE) - https://www.rfc-editor.org/info/rfc2784
- Linux `ip-link(8)` manual - https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-tunnel(8)` manual - https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux `ip(7)` manual - https://man7.org/linux/man-pages/man7/ip.7.html
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.18/networking/ip-sysctl.html
- FRRouting PIM documentation - https://docs.frrouting.org/en/stable-10.2/pim.html
- SMCRoute project documentation - https://github.com/troglobit/smcroute
- `smcroute.conf(5)` - https://man.troglobit.com/man5/smcroute.conf.5.html
- `smcroutectl(8)` - https://man.troglobit.com/man8/smcroutectl.8.html
- `mcjoin(1)` - https://man.troglobit.com/man1/mcjoin.1.html
- iperf2 manual - https://iperf2.sourceforge.io/iperf-manpage.html
- iperf3 manual source - https://raw.githubusercontent.com/esnet/iperf/master/src/iperf3.1

## Issues Found
- The FRR snippet used `ip pim sparse-mode`, which is not the documented FRR interface command. It was corrected to `ip pim`, and `ip igmp` was added on the LAN-facing interface because FRR documents IGMP handling separately from PIM.
- The post omitted the Linux multicast-routing prerequisite. I added `net.ipv4.conf.all.mc_forwarding=1` plus per-interface `mc_forwarding` commands because the kernel documentation requires them for multicast routing.
- The SMCRoute section used `smcroutectl start`, which is not a valid `smcroutectl` command. It was replaced with `systemctl restart smcroute.service`, which matches the project’s documented systemd integration.
- The SMCRoute join example implied `smcroutectl` could be used standalone. I clarified that `smcrouted` must already be running before using `smcroutectl join`.
- The static SMCRoute example was incomplete for IGMP-snooping environments. I added an `mgroup` line to match the project’s documented pattern of pairing group joins with static multicast routes.
- The `iperf3` multicast example was invalid. The current iperf3 manual does not provide the old multicast TTL workflow shown in the post, and iperf3 still requires a TCP control connection. I removed that example and kept a corrected iperf2 multicast example, which is documented to support multicast group binding and `-T` TTL.
- The inline `! RP address` text in the FRR CLI snippet was removed so the pasted command block contains only CLI input.

## Review Notes
- The examples are Linux-specific, and the package/service commands in the SMCRoute section assume a Debian/Ubuntu-style environment with `apt` and `systemd`.
- The sample GRE and multicast examples are technically valid, but real deployments may still need MTU tuning and firewall allowances for GRE (`ip proto 47`), IGMP, and PIM.
