# Validation Summary: How to Set Up Keepalived for VRRP/IP Failover on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Keepalived (VRRP daemon)
- VRRP (Virtual Router Redundancy Protocol, RFC 5798 / RFC 3768)
- Ubuntu (systemd, apt)
- iptables / UFW (firewall configuration for IP protocol 112 and multicast 224.0.0.18)
- nginx (used as the example tracked service)
- tcpdump (for sniffing VRRP advertisements)

## Sources Consulted
- keepalived.conf(5) manpage: https://man.archlinux.org/man/extra/keepalived/keepalived.conf.5.en
- Keepalived user guide: https://keepalived.readthedocs.io/
- Keepalived source (`lib/signals.c`) for signal handling: https://fossies.org/linux/keepalived/lib/signals.c
- Keepalived issue #2224 on auth_pass truncation: https://github.com/acassen/keepalived/issues/2224
- ufw(8) manpage: https://manpages.ubuntu.com/manpages/focal/man8/ufw.8.html
- ufw source (`src/common.py` `set_protocol`) for the allowlist of accepted protocol names
- /etc/protocols on Ubuntu (VRRP listed as protocol 112)

## Issues Found
1. **Fabricated `global_defs` directive** — The master config included `vrrp_skip_if_not_master` inside `global_defs`. This is not a real Keepalived directive (valid related directives include `vrrp_skip_check_adv_addr`, `vrrp_strict`, etc.). Keepalived would fail to parse the config or warn about an unknown keyword. **Fix:** removed the line and its comment.
2. **Wrong signal for stats dump** — The Monitoring section used `kill -USR1 $(pidof keepalived)` followed by `cat /tmp/keepalived.stats`. SIGUSR1 dumps configuration/state to `/tmp/keepalived.data`; SIGUSR2 is the signal that dumps statistics to `/tmp/keepalived.stats`. **Fix:** changed to `-USR2` and added a short clarifying comment noting what USR1 does.
3. **Invalid UFW commands** — `sudo ufw allow in on eth0 proto 112` will be rejected: UFW's `proto` keyword only accepts a hardcoded allowlist (tcp, udp, ah, esp, gre, ipv6, igmp), not numeric protocols or names from /etc/protocols. **Fix:** replaced the UFW commands with a note that VRRP must be allowed via raw rules in `/etc/ufw/before.rules`, keeping the (correct) iptables commands.

## Review Notes
- **auth_pass truncation:** VRRP authentication is limited to 8 bytes (`VRRP_AUTH_LEN = 8` in the Keepalived source, per RFC 2338/3768). The example uses `mySecurePass123` (15 chars) which Keepalived silently truncates to `mySecure`. Functionally fine for the demo, but a reader might assume the full password adds security. Worth a note in a future revision.
- **VRRPv3 / authentication:** Keepalived defaults to VRRPv2. RFC 5798 (VRRPv3) removed the authentication field; if a user sets `vrrp_version 3`, the `authentication { ... }` block is silently ignored. Not in scope to add here, but worth knowing.
- **`vrrp_strict`:** Not used in the examples. If a future reader enables it globally, the unicast example would still pass, but having a `virtual_ipaddress` of more than one VIP per instance and other patterns can interact with strict mode. Acceptable for an introductory tutorial.
- **Preemption + tracked scripts:** The "Health Check Tracking Scripts" section correctly explains the priority math (101 − 20 = 81). With `nopreempt`, however, a recovered node will not reclaim the VIP even if its priority returns to higher than the current holder — the post is consistent on this point.
- **Multicast assumption:** The firewall section assumes the LAN supports VRRP multicast. The unicast example covers the alternative correctly.
