# Validation Summary: How to Troubleshoot ARP Table Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux ARP / IP neighbor subsystem (`ip neigh`, legacy `arp`)
- Linux kernel sysctls under `net.ipv4.neigh.*` and `net.ipv4.conf.*`
- `arping` utility (gratuitous ARP, reachability test)
- `arp-scan`, `arpwatch` (ARP discovery and spoofing detection)
- `tcpdump` BPF filters for ARP packets
- Netplan / systemd-networkd
- Kubernetes CNIs (Calico, Flannel) and proxy ARP

## Sources Consulted
- Kernel networking sysctl reference: https://docs.kernel.org/networking/ip-sysctl.html
- `ip-neighbour(8)` man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- `arp(7)` man page: https://man7.org/linux/man-pages/man7/arp.7.html
- `arping(8)` man page: https://man7.org/linux/man-pages/man8/arping.8.html
- RFC 826 (Ethernet ARP packet layout)
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/

## Issues Found

1. **`ucast_solicit` / `mcast_solicit` mislabeled as time values.** The post described them as "Maximum time to wait for ARP response (default: 500ms)". These sysctls are integer **counts** of solicitations to send (default 3 each), not time values. The actual retransmit timer is `retrans_time_ms` (default 1000 ms). Replaced the comment and added `retrans_time_ms` alongside, with corrected descriptions.

2. **`tcpdump` spoofing filter used the wrong offset.** The filter `arp[24:4]=<gw_hex>` matches the **target** protocol address (the IP being asked about), not the **sender** protocol address (the IP being claimed). For detecting someone announcing themselves as a particular IP, the correct offset is `arp[14:4]`. Changed the filter accordingly and updated the comment to explain the offset.

3. **Netplan "neighbors" support claim removed.** The commented YAML claimed "Netplan 0.105+ supports static ARP (neighbors)", but Netplan's YAML reference has no `neighbors` keyword and no native static ARP support. Replaced with a note pointing to systemd-networkd `[Neighbor]` sections or a `networkd-dispatcher` hook.

## Review Notes

- The NUD state list (reachable, stale, delay, probe, failed) is fine for a basic explanation; INCOMPLETE is covered later in its own section. `NOARP` and `PERMANENT` aren't introduced but the latter is shown in example output, which is acceptable.
- The default for `base_reachable_time_ms` is correctly stated as 30 seconds (30000 ms). Worth noting (but not corrected in the post) that the kernel randomizes the actual REACHABLE timer between 0.5x and 1.5x of this value.
- `arping -U` (unsolicited ARP request) is correct for failover. `arping -A` (gratuitous ARP **reply**) is a common alternative; some HA stacks prefer it but both are valid.
- The post recommends `sudo tail -f /var/log/syslog | grep arpwatch`. On modern Ubuntu using journald-only configurations, `journalctl -fu arpwatch` may be more reliable, but `/var/log/syslog` still works on default Ubuntu installs with rsyslog.
- `gc_thresh1/2/3` defaults (128/512/1024) are correct and match current kernel defaults.
