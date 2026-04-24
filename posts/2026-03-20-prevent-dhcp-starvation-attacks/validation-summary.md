# Validation Summary: How to Prevent DHCP Starvation Attacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP / DHCPv4
- Cisco DHCP snooping
- Cisco port security
- ISC DHCP (`dhcpd`)
- Bash

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/html/rfc2131
- Cisco, IP DHCP Snooping Commands: https://www.cisco.com/c/en/us/td/docs/switches/lan/csbss/CBS220/CLI-Guide/b_220CLI/ip_dhcp_snooping_commands.html
- Cisco, DHCP Snooping / Prevent DHCP Starvation Attacks: https://www.cisco.com/en/US/docs/voice_ip_comm/cucm/srnd/5x/50scurty.html
- Cisco, Operate and Troubleshoot DHCP Snooping on Catalyst 9000 Switches: https://www.cisco.com/c/en/us/support/docs/ip/dynamic-host-configuration-protocol-dhcp-dhcpv6/217055-operate-and-troubleshoot-dhcp-snooping.html
- Cisco, Port Security (Catalyst 2960-L Security Configuration Guide): https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960l/software/15-2_7_e/configuration_guide/sec/b_1527e_security_2960l_cg/port_security.html
- Cisco, `switchport port-security aging` command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/12-2_55_se/command/reference/2960_cr/cli3.html
- ISC DHCP 4.4 Manual Pages, `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.1 Manual Pages, `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcpdconf
- ISC DHCP 4.4 Manual Pages, `dhcpd.leases`: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases

## Issues Found
- The post said legitimate clients receive `DHCPNAK or no response` after starvation. RFC 2131 distinguishes these cases: new clients that do not get an address receive no `DHCPOFFER`, while `DHCPNAK` applies to invalid or expired address reuse. I corrected the explanation accordingly.
- The port-security text said it prevents MAC spoofing. Cisco documents port security as limiting secure MAC addresses per port and triggering violations when the maximum is exceeded; that helps contain MAC churn, but it does not generally prevent all spoofing. I corrected the wording and added `switchport port-security aging type inactivity` so the aging example matches Cisco's documented behavior more safely.
- The section labeled `Small Address Pools` treated pool shrinkage as a mitigation. That is backwards: reducing the pool also reduces legitimate address capacity. I changed the section to focus on short lease times, which ISC DHCP documents as a way to recover more quickly from high pool utilization.
- The `deny unknown-clients` example placed the directive directly inside a subnet. ISC DHCP recommends using `deny unknown-clients;` inside a `pool` declaration when restricting dynamic allocation. I moved it into a pool and adjusted the explanation.
- The monitoring script counted `binding state active` lines with `grep`, which can overcount because `dhcpd.leases` is append-only and the last declaration for a lease is the current one. I replaced the count with an `awk` parser that tracks the latest binding state per lease.
- The Bash example placed a comment before the shebang. I moved `#!/bin/bash` to the first line so the snippet is executable as a script file.

## Review Notes
- The alerting example still assumes a configured local `mail` command and MTA.
- Cisco DHCP snooping and port-security defaults vary somewhat by switch family and software train; the corrected commands are valid Cisco syntax, but exact defaults should still be checked on the target platform.
- MAC-based allowlisting in DHCP is an administrative control, not strong authentication; attackers who can spoof an authorized MAC address may still bypass it.
