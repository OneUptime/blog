# Validation Summary: How to Configure VRF (Virtual Routing and Forwarding) on Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Linux kernel VRF (Virtual Routing and Forwarding)
- iproute2 (`ip link`, `ip route`, `ip vrf`, `ip addr`)
- systemd-networkd (`.netdev` and `.network` configuration)

## Sources Consulted
- Kernel VRF documentation: https://www.kernel.org/doc/Documentation/networking/vrf.txt
- iproute2 manual pages (`ip-link(8)`, `ip-route(8)`, `ip-vrf(8)`, `ip-address(8)`)
- systemd.netdev manual: https://www.freedesktop.org/software/systemd/man/systemd.netdev.html (Kind=vrf, [VRF] Table=)
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/systemd.network.html (VRF= directive)
- Cumulus Networks VRF documentation (cross-reference for `ip vrf exec`/cgroup v2 behavior)

## Issues Found
- The comment `# Test DNS resolution within VRF` above `ip vrf exec customer-a curl http://10.50.0.1` was misleading because the curl invocation targets a literal IPv4 address and performs no DNS resolution. Updated the comment to `# Test HTTP connectivity within VRF`, which accurately describes what the command demonstrates.

## Review Notes
- All `ip` command syntax (`ip link add ... type vrf table N`, `ip link set <iface> master <vrf>`, `ip route add ... vrf <name>`, `ip vrf exec <vrf> <cmd>`, `ip vrf show`, `ip route show vrf <name>` and `ip route show table N`) is correct and matches current iproute2 behavior.
- The `ip vrf exec` command relies on cgroup v2 (specifically the `bpf` controller); on older systems lacking cgroup v2 with bpf, this may require additional setup, but that is beyond the scope of the post.
- The systemd-networkd `.netdev` (Kind=vrf, [VRF] Table=10) and `.network` (VRF=customer-a) snippets are correct. In some configurations users may also want a separate `.network` file matching the VRF device itself to bring it administratively up, but systemd-networkd will create and bring up the netdev as defined; the post's setup is functional.
- Routing isolation caveat at the end (use iptables/netfilter or namespaces for stronger boundaries) is accurate — VRFs alone do not enforce packet filtering between VRFs.
