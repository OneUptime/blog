# Validation Summary: How to Set Up an IPv6 Test Lab

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IPv6
- Linux network namespaces
- iproute2 (`ip netns`, `ip link`, `ip -6 addr`, `ip -6 route`)
- Linux IPv6 forwarding sysctl
- FRRouting OSPFv3
- iputils `ping`
- BIND `host`
- KVM/QEMU, GNS3, EVE-NG, and Containerlab
- Cloud IPv6 networking

## Sources Consulted
- FRRouting Basic Setup: https://docs.frrouting.org/en/stable-8.4/setup.html
- FRRouting OSPFv3 documentation: https://docs.frrouting.org/en/stable-8.4/ospf6d.html
- FRRouting current OSPFv3 documentation: https://docs.frrouting.org/en/stable-10.1/ospf6d.html
- Linux `ip-netns(8)` manual: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Linux `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iputils `ping(8)` manual: https://www.man7.org/linux/man-pages/man8/ping.8.html
- BIND `host(1)` manual: https://bind9.readthedocs.io/en/v9.18.2/manpages.html
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4861, IPv6 Neighbor Discovery: https://www.rfc-editor.org/rfc/rfc4861.html

## Issues Found
- The interface bring-up loop searched for `veth` in `ip link show` output and only selected one interface per namespace. This could leave interfaces down and missed the second interface on `r2`. Replaced it with explicit `ip link set ... up` commands for all four veth endpoints.
- The static route section did not install routes on `r2` to either edge router loopback, so `r1` to `r3` loopback reachability would fail. Replaced the edge host routes with edge default routes and added the two required middle-router host routes.
- The FRR OSPFv3 snippet used `ipv6 router ospf6` and `router-id`, which are not FRR OSPF6 configuration commands. Updated it to `router ospf6` and `ospf6 router-id`, and used `write memory`.
- The validation checklist inspected the host namespace instead of the lab namespaces and checked router advertisements even though the minimal lab uses static routes. Updated the checks to run through `ip netns exec`, verify static routes, and run reachability and MTU pings from `r1`.
- The DNS check was labeled as a lab check even though it runs from the host and depends on external Internet/DNS reachability. Relabeled it as a host-side AAAA lookup.

## Review Notes
Bash snippets were syntax-checked with `bash -n`. A live namespace smoke test could not be run because this environment requires an interactive sudo password for `ip netns` operations. `2001:db8::/32` is appropriate for documentation and lab examples and is intentionally non-routable.
