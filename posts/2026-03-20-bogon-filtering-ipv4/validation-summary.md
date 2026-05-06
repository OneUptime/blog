# Validation Summary: How to Understand Bogon Filtering for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 special-use address space
- Linux `iptables`
- Linux `ipset`
- Linux kernel `sysctl` martian logging
- `dmesg` and basic log inspection

## Sources Consulted
- IANA IPv4 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 1112, Host Extensions for IP Multicasting: https://www.rfc-editor.org/rfc/rfc1112
- Linux kernel IP sysctl documentation (`log_martians`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `iptables` man page: https://ipset.netfilter.org/iptables.man.html
- `iptables-extensions` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- `ipset` man page: https://ipset.netfilter.org/ipset.man.html
- Local CLI help output: `iptables --help`, `iptables -m set -h`, `grep --help`, `sysctl --help`

## Issues Found
- The post described the example list as if it covered bogons broadly, including unallocated space, but the static rules shown are really a curated set of common IPv4 special-use ranges. I corrected the description and opening explanation to match what the commands actually implement.
- The original list included `192.0.0.0/24` as a blanket bogon block. The current IANA registry reserves `192.0.0.0/24` for IETF protocol assignments but explicitly carves out more-specific addresses inside that `/24` that are valid for use, so filtering the entire `/24` would be overbroad. I removed that block from the table and both command examples.
- The post omitted `192.0.2.0/24`, which RFC 5737 reserves for documentation alongside `198.51.100.0/24` and `203.0.113.0/24`. I added `192.0.2.0/24` to the table and both filter examples.
- The log analysis example relied on `/var/log/syslog` and GNU `grep -P`, which is unnecessarily distro-specific for a general Linux post. I changed it to use `dmesg` and `grep -oE`, which matches the documented `LOG` target behavior more directly.
- The martian logging section said the kernel can detect and log bogon-sourced packets generally. The kernel documentation scopes `log_martians` to packets with impossible addresses, so I corrected that explanation.
- The closing claim that the vast majority of internet attack traffic comes from spoofed bogon addresses was too broad and not supported by the cited standards documentation. I replaced it with a narrower, accurate benefit statement.

## Review Notes
The post is now technically sound for a static `iptables`/`ipset` example focused on common IPv4 special-use source ranges. A fully dynamic bogon list that also tracks currently unallocated space would need to come from a maintained external feed rather than a hard-coded static list.
