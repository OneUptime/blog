# Validation Summary: How to Understand DHCPv6 UDP Ports (546 and 547)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- UDP
- `ss`
- `ip6tables`
- `nftables`
- `nc` / netcat
- `tcpdump`

## Sources Consulted
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)": https://www.rfc-editor.org/info/rfc8415
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- OpenBSD `nc(1)` manual page: https://man.openbsd.org/nc.1
- nftables wiki quick reference: https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes
- Local command help checked in the review environment: `ss --help`, `nc -h`, `ip6tables --help`, `nft --help`, `tcpdump --help`

## Issues Found
- The `UDP 547` table entry was too narrow for relay-agent behavior. RFC 8415 says servers and relay agents listen on UDP port 547, and relay agents also receive `Relay-reply` traffic on that port. I updated the table text and summary sentence to reflect that.
- The firewall section said rules must "explicitly" allow DHCPv6 traffic. That wording was broader than necessary for generic firewall guidance, so I changed it to say firewall rules must allow DHCPv6 traffic on these ports.
- The `nc -6 -u -z` troubleshooting example claimed that exit status `0` meant the server port was reachable. OpenBSD `nc(1)` documents that UDP scans with `-uz` always report success regardless of the target state. I kept the command but corrected the explanation so readers know it only confirms a local probe attempt and must be paired with packet capture or server logs.

## Review Notes
- The networking and firewall examples are Linux-specific; output format and process visibility for commands such as `ss -p` can vary by distribution and privilege level.
