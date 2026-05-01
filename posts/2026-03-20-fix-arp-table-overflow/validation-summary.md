# Validation Summary: How to Fix ARP Table Overflow on Switches and Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP and Linux neighbor tables
- Linux `iproute2` (`ip neigh`)
- Linux kernel neighbor sysctls
- Bash shell commands and monitoring
- Cisco IOS / IOS XE ARP configuration and verification

## Sources Consulted
- Linux Kernel documentation: IP sysctls for neighbor cache thresholds and `proxy_arp` behavior: https://docs.kernel.org/6.4/networking/ip-sysctl.html
- Linux man pages consulted locally: `arp(7)` and `ip-neighbour(8)`
- Cisco IOS XE ARP configuration guide: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_arp-config-arp-0.html
- Cisco IOS IP Addressing Services Command Reference (`arp timeout`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-a1.html
- Cisco IOS IP Addressing Services Command Reference (`ip arp proxy disable`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book/ipaddr-i1.html
- Cisco `show logging` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_logging.htm
- Cisco `show ip interface` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_ip_interface.htm
- RFC 826, Address Resolution Protocol: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 7342, Practices for Scaling ARP and Neighbor Discovery (ND) in Large Data Centers: https://www.rfc-editor.org/rfc/rfc7342.html

## Issues Found
- The Linux overflow log command searched for `neighbor table overflow`, but the kernel message is `neighbour table overflow!`. I changed the grep expressions so they match the actual message and added a `journalctl -k` variant for systems using the systemd journal.
- The explanations for `gc_thresh1`, `gc_thresh2`, `gc_thresh3`, and `gc_stale_time` did not match the Linux kernel documentation. I corrected the comments so they describe the real garbage-collection thresholds and stale-entry timing behavior.
- The post compared `ip neigh show | wc -l` directly against `gc_thresh3`, which is not exact because `gc_thresh3` applies to non-permanent neighbor entries. I updated the counting examples and the monitoring script to count non-permanent entries instead.
- Several Cisco IOS examples were too generic or used the wrong command/mode for a general IOS / IOS XE post. I replaced `show arp | count`, `show platform resources | include ARP`, and `show mac address-table count` with documented ARP inspection commands; changed `show log` to `show logging`; moved `arp timeout` into interface configuration mode; and changed proxy-ARP verification to `show ip interface`.
- The Cisco text implied that `ip arp proxy disable` adjusts ARP table allocation. That is not what the command does; it globally disables proxy ARP. I removed that implication and kept proxy-ARP tuning in the dedicated proxy-ARP section.
- The Linux flush example used `ip neigh flush all`, which is not the documented `ip neigh flush` form shown in `ip-neighbour(8)`. I corrected it to `sudo ip neigh flush nud all` and added `sudo` to the flush commands because they require administrative privileges in normal environments.

## Review Notes
- Cisco ARP resource-exhaustion logging is platform-specific. Generic IOS / IOS XE commands such as `show arp`, `show arp summary`, `show ip arp`, and `show logging` are appropriate for this post, but some hardware families expose additional platform-only resource commands that should not be presented as universal syntax.
- The post still uses `/etc/sysctl.conf`, which is valid. Some Linux distributions prefer drop-in files under `/etc/sysctl.d/`, but that is an operational preference rather than a technical error.
