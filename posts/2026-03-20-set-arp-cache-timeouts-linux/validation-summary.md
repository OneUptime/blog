# Validation Summary: How to Set ARP Cache Timeouts on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux ARP and neighbor cache
- Neighbor Unreachability Detection (NUD) states
- Linux `sysctl` and `/proc/sys/net/ipv4/neigh/*` parameters
- iproute2 `ip neigh`
- procps-ng `sysctl` and `watch`

## Sources Consulted
- Linux `arp(7)` manual: https://man7.org/linux/man-pages/man7/arp.7.html
- Linux iproute2 `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- procps-ng `sysctl(8)` manual: https://man7.org/linux/man-pages/man8/sysctl.8.html
- procps-ng `sysctl.conf(5)` manual: https://man7.org/linux/man-pages/man5/sysctl.conf.5.html
- Linux kernel IP Sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 826, Address Resolution Protocol: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 4861, Neighbor Discovery for IPv6 / NUD state model: https://www.rfc-editor.org/rfc/rfc4861.html
- Local command checks on Linux 6.17 with iproute2 6.1.0 and procps-ng 4.0.4: `ip neigh help`, `sysctl`, `man 7 arp`, `man 8 sysctl`, and `watch --version`
- Related OneUptime links in the post were opened and confirmed to resolve.

## Issues Found
- The opening description called the implementation an "ND subsystem" and did not name the Linux neighbor cache / NUD state model precisely. Updated it to refer to the neighbor cache subsystem and Neighbor Unreachability Detection states.
- The `sysctl -a | grep` example did not match `ucast_solicit` or `mcast_solicit`, even though those values were shown in the defaults. Updated the regex to match the displayed IPv4 neighbor parameters and avoid unrelated IPv6 or extra multicast settings.
- The post implied `net.ipv4.neigh.default.*` timing changes apply directly to existing interfaces. Added a note that default timing values are inherited by newly created interfaces and existing interfaces should use the per-interface path.
- The state diagram used non-standard `NEW`, treated `gc_stale_time` as a STALE-state lifetime, and referenced deprecated-style `retrans_time`. Updated the diagram to use `NONE`, show that the REACHABLE timer is randomized from `base_reachable_time_ms`, show STALE-to-DELAY as packet-driven, and use `retrans_time_ms`.
- The tuning examples described `base_reachable_time_ms` as an exact REACHABLE duration and `gc_stale_time` as STALE retention. Corrected the wording to describe the randomized reachable base timer and stale-entry check interval.
- The persistence example used `cat >> /etc/sysctl.conf`, which would fail for a normal sudo user because shell redirection happens before privilege escalation. Changed it to `sudo tee -a /etc/sysctl.conf > /dev/null`.
- The verification section said it showed entry ages, but the command watches neighbor states. Renamed the section to "Verifying Current Entry States."

## Review Notes
- The `gc_thresh1`, `gc_thresh2`, and `gc_thresh3` defaults and meanings match the Linux manuals and kernel documentation.
- `/etc/sysctl.conf` plus `sudo sysctl -p` is valid for procps `sysctl`; on systemd-managed systems, a drop-in under `/etc/sysctl.d/` is often preferable for boot-time persistence.
- The post focuses on IPv4 ARP via `net.ipv4.neigh.*`. IPv6 has analogous neighbor-cache settings under `net.ipv6.neigh.*`, but those are outside this article's scope.
