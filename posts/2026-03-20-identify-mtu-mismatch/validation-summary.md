# Validation Summary: How to Identify MTU Mismatch Issues on Network Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2` (`ip`, `ip link`)
- `iputils` (`ping`, `tracepath`)
- Docker bridge networking
- WireGuard
- VLAN interfaces
- Path MTU Discovery (PMTUD)

## Sources Consulted
- `ip-link(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ip-link.8.html
- `ping(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tracepath.8.html
- Docker CLI reference for `docker network inspect`: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- WireGuard `wg-quick(8)` manual: https://git.zx2c4.com/wireguard-tools/tree/src/man/wg-quick.8
- WireGuard Linux `wg-quick` implementation: https://git.zx2c4.com/wireguard-tools/tree/src/wg-quick/linux.bash
- RFC 1191, Path MTU Discovery: https://datatracker.ietf.org/doc/html/rfc1191
- RFC 8201, Path MTU Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc8201

## Issues Found
- The original `awk` example used `match(..., ..., array)`, which is not portable to `mawk` and fails on common Linux systems. It was replaced with a portable `ip -o link show | awk ...` form.
- The `ping` payload-size examples implicitly assumed IPv4 header sizing but did not force IPv4. `-4` was added and the comments were clarified so the `MTU - 28` calculation is correct for the examples shown.
- The `tracepath` section incorrectly implied that it reports each hop's MTU directly. It was corrected to describe end-to-end path MTU discovery and to explain that `tracepath` shows where PMTU changes were observed, not authoritative per-hop interface MTUs.
- The Docker example used `docker network inspect bridge | grep Mtu`, which does not reliably match Docker's documented MTU option key. It was changed to inspect `.Options` and look for `com.docker.network.driver.mtu`, which is the documented bridge MTU setting.
- The WireGuard section stated that the MTU "should be `eth0_MTU - 80`". This was too absolute. It was corrected to reflect `wg-quick`'s documented auto-MTU behavior and the Linux implementation's 80-byte subtraction when auto-calculating.
- The shell script used an unused `HOST1` variable, did one-way testing while claiming two-host verification, and relied on `grep -oP` for PMTU extraction. It was corrected to describe one-way testing from the local host, note that both directions should be tested, force IPv4 for the example probes, and use a portable `awk` parser for `tracepath` output.

## Review Notes
- The `ping -s 1472` and `-s 8972` examples are correct for IPv4 because `ping`'s `-s` flag sets ICMP payload size and the examples subtract 20 bytes of IPv4 header plus 8 bytes of ICMP header. Equivalent IPv6 probes would need different sizing.
- `tracepath` identifies the path MTU observed from the probing host to the destination. Confirming the exact constricting interface still requires checking the router, switch, tunnel, or host configuration on that segment.
- The Docker MTU example is specific to Docker Engine bridge networks on Linux. Other network drivers or orchestration layers may surface MTU settings differently.
- The WireGuard auto-MTU note is specific to `wg-quick` on Linux. Manually configured interfaces or non-Linux clients can behave differently.
