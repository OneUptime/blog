# Validation Summary: How to Set Up Keepalived with IPv6 Virtual IPs

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough)

## Technologies Covered
- Keepalived (VRRP implementation for Linux)
- VRRPv3 (RFC 5798) and VRRPv2
- IPv6 / Neighbor Discovery / Router Advertisements
- iptables / ip6tables / firewalld / nftables
- HAProxy (load balancer integration)
- systemd, IPsec (strongSwan), Linux networking (`ip`, `ndisc6`, `tcpdump`)

## Sources Consulted
- keepalived.conf(5) man page — Debian testing: https://manpages.debian.org/testing/keepalived/keepalived.conf.5.en.html
- keepalived.conf(5) man page — Ubuntu Focal: https://manpages.ubuntu.com/manpages/focal/man5/keepalived.conf.5.html
- Red Hat: centisecond advertisement interval / VRRPv3 support in keepalived: https://access.redhat.com/solutions/3101821
- RFC 5798 (VRRPv3) — multicast group, no built-in authentication: https://tools.ietf.org/html/rfc5798

## Issues Found
1. **Invalid `log_level 4` directive (both Master and Backup global_defs blocks).** keepalived has no `log_level` configuration directive; log verbosity is controlled via command-line flags / syslog, not the config file. Including it would cause a config parse error. Removed the directive and its "Logging configuration" comment from both example configs.
2. **Incorrect comment on `enable_script_security`.** The comment read "Enable IPv6 forwarding for this instance," which is wrong — `enable_script_security` refuses to run scripts as root when any part of the script path is writable by a non-root user (and enforces the `keepalived_script` default user). It has nothing to do with IPv6 forwarding. Rewrote the comment to describe its actual function.
3. **Incorrect advert_int comment in Troubleshooting (Issue 3).** The comment claimed "minimum 1 second for VRRPv3," then immediately showed `advert_int 0.1`, which is self-contradictory. The whole-second minimum applies to VRRPv2; VRRPv3 uses centisecond units and supports sub-second intervals. Corrected the comment to attribute the 1-second minimum to VRRPv2 and clarified that VRRPv3 enables sub-second timing.
4. **Misleading comment on `virtual_ipaddress_excluded`.** The comment said "Optionally specify the interface per VIP," but that is not the purpose of this block (per-interface `dev` syntax is also valid in plain `virtual_ipaddress`). `virtual_ipaddress_excluded` holds addresses that are added/removed on failover but are *not* advertised in VRRP packets — used for large VIP sets or for mixing address families. Corrected the comment.

## Review Notes
- **Authentication with VRRPv3:** The basic, multi-VIP, dual-stack, and health-check example configs include `authentication { auth_type PASS ... }` together with `vrrp_version 3`. Per RFC 5798, VRRPv3 dropped protocol authentication; keepalived ignores the authentication block (with a warning) when running VRRPv3. The post itself correctly notes this in the Troubleshooting (Issue 5) and Summary sections, so the configs still function. Left as-is to avoid restructuring, but a future revision could drop these auth blocks from the VRRPv3 examples to avoid teaching an ignored setting.
- Core IPv6 facts are accurate: VRRP IPv6 multicast group `ff02::12`, VRRP IP protocol number 112, VRRPv3 required for native IPv6, and the ARP-gratuitous → unsolicited Neighbor Advertisement distinction.
- `keepalived --config-test` is valid (introduced in keepalived 2.0.7); readers on much older builds may not have it.
- Diagnostic commands such as `ping6 ff02::12%eth0` and `ndisc6 -q <vip> eth0` are reasonable troubleshooting aids; hosts may not always reply to the VRRP multicast group, so absence of a reply there is not definitive.
