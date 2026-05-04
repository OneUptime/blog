# Validation Summary: How to Configure Multicast Firewall Rules in iptables

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- iptables (Linux netfilter)
- IPv4 multicast (224.0.0.0/4)
- IGMP (IP protocol 2)
- Linux sysctl / /proc networking parameters
- iptables-persistent (Debian/Ubuntu) and `service iptables save` (RHEL/CentOS)
- `limit` match module for rate limiting

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- iptables(8) and iptables-extensions(8) man pages
- RFC 5771 (IANA Guidelines for IPv4 Multicast Address Assignments) and RFC 3171 (legacy) — multicast address ranges
- /etc/protocols definition of `igmp` (protocol 2)
- Linux kernel source `net/ipv4/devinet.c` for `mc_forwarding` sysctl mode
- OpenWrt ticket #12241 and Debian kernel mailing list confirming mc_forwarding read-only behavior
- iptables-persistent and netfilter-persistent Debian/Ubuntu package documentation

## Issues Found
1. **Incorrect command for enabling multicast forwarding.** The original post had:
   ```bash
   echo 1 | sudo tee /proc/sys/net/ipv4/conf/all/mc_forwarding
   ```
   This is technically wrong: `mc_forwarding` is registered in the kernel as a read-only sysctl (mode `0444` in `net/ipv4/devinet.c`). It cannot be written from userspace and will fail with `Permission denied`. The kernel sets it automatically when a multicast routing daemon (smcroute, pimd, mrouted, etc.) opens an `IPPROTO_IGMP` socket and calls `setsockopt(MRT_INIT)`. The control knob the post actually wants for the FORWARD chain to engage is `net.ipv4.ip_forward`. Replaced the command with:
   ```bash
   echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
   ```
   and added a short note explaining that real multicast routing across subnets additionally needs a multicast routing daemon.

## Review Notes
- All other multicast address claims are correct: 224.0.0.0/4 is the full IPv4 multicast range, and 224.0.0.0/24 is the link-local "Local Network Control Block" used by OSPF (224.0.0.5/6), EIGRP (224.0.0.10), and mDNS (224.0.0.251).
- IGMP is correctly identified as IP protocol 2, and `iptables -p igmp` is valid (resolved via `/etc/protocols`).
- The rate-limiting comment ("1 Mbit equivalent via packet rate") is loose — 1000 pps only equals ~1 Mbit at very small (~125 byte) packets — but the iptables `limit` match command itself is syntactically and behaviorally correct, so no change made.
- `service iptables save` is accurate for RHEL/CentOS 6/7. On RHEL/CentOS 8+ the default firewall backend is nftables/firewalld; readers on those versions may need `iptables-services` from EPEL or to migrate to nftables. Not flagged as an error since the post does not promise newer-version coverage.
- `iptables -L -n -v` still prints protocol names (e.g. `igmp`) regardless of `-n`, so the final `grep -E "224|igmp|239"` works as intended.
