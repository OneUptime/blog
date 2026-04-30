# Validation Summary: How to Configure IPv6 Firewall Rules on pfSense

## Status
validated

## Post Type
Guide

## Technologies Covered
- pfSense
- PF (Packet Filter)
- FreeBSD
- IPv6
- ICMPv6
- PF state table

## Sources Consulted
- pfSense IPv6 Configuration Types: https://docs.netgate.com/pfsense/en/latest/interfaces/configure-ipv6.html
- pfSense Advanced Networking / Allow IPv6: https://docs.netgate.com/pfsense/en/latest/config/advanced-networking.html
- pfSense Configuring Firewall Rules: https://docs.netgate.com/pfsense/en/latest/firewall/configure.html
- pfSense Floating Rules: https://docs.netgate.com/pfsense/en/latest/firewall/floating-rules.html
- pfSense Viewing the PF ruleset: https://docs.netgate.com/pfsense/en/latest/firewall/pf-ruleset.html
- pfSense IPv6 Subnets / NDP and RA behavior: https://docs.netgate.com/pfsense/en/latest/network/ipv6/subnets.html
- pfSense Viewing Firewall States in the GUI: https://docs.netgate.com/pfsense/en/latest/monitoring/status/firewall-states-gui.html
- pfSense Working with Log Files: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/manage.html
- pfSense Raw Filter Log Format: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/raw-filter-format.html
- FreeBSD `pfctl(8)` manual: https://man.freebsd.org/pfctl
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://www.ietf.org/rfc/rfc5095.html

## Issues Found
- The prerequisites section referred to an `Enable IPv6` checkbox on the WAN interface. Current pfSense uses `IPv6 Configuration Type`, and global IPv6 traffic handling is controlled separately by `System > Advanced > Networking > Allow IPv6`. I corrected the GUI guidance.
- The LAN prerequisite described the LAN interface as `SLAAC or DHCPv6`, which is misleading for pfSense interface configuration. I corrected this to the current pfSense interface models: typically `Track Interface` or `Static IPv6`.
- Multiple sample IPv6 prefixes were syntactically invalid because they used non-hexadecimal words such as `mgmt`, `monitoring`, and `admin` inside IPv6 addresses. I replaced them with valid documentation and ULA prefixes.
- The inbound SSH example incorrectly attached port `22` to the source prefix instead of the destination. I moved the port match to the destination field.
- The ICMPv6 section implied that these rules should be visible as existing WAN GUI rules. pfSense instead auto-adds NDP-related handling on IPv6-enabled interfaces, and ICMPv6 requirements depend on interface role. I rewrote this section to describe the required traffic accurately.
- The floating-rule example claimed pfSense could block RH0 through a GUI rule plus “Advanced Options for custom pf rules”. That guidance was not accurate. I replaced it with a valid floating-rule example and noted that RH0 matching is not exposed in the GUI and RH0 is deprecated by RFC 5095.
- The CLI section showed temporary custom PF rule loading that was not reliable as written and could mislead readers about supported pfSense workflow. I replaced it with verified inspection commands from pfSense and `pfctl` documentation.
- The state-table section described GUI filters that do not exist (`IPv6` and `Source` fields). I corrected it to the actual `State Filter` behavior documented by pfSense.
- The logging section used `clog` and `grep IPv6`, which is outdated or inaccurate for current pfSense releases. I replaced it with current log guidance and a raw-log IPv6 filter based on the documented filter log format.

## Review Notes
- The revised CLI log example assumes current pfSense releases, where firewall logs are plain text. Older pfSense releases before Plus 21.02 / CE 2.5.0 used `clog`, but those instructions are legacy-only.
- The post now uses documentation-safe IPv6 example prefixes from `2001:db8::/32` and a valid ULA example prefix.
