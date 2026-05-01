# Validation Summary: How to Detect UDP Port Availability with nmap

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nmap
- UDP port scanning
- Nmap NSE scripts
- DNS / `dig`
- NTP / `sntp`
- SNMP / `snmpwalk`
- Syslog / `logger`
- Linux firewall tooling (`iptables`, `nft`)

## Sources Consulted
- Nmap UDP scan documentation: https://nmap.org/book/scan-methods-udp-scan.html
- Nmap port scanning techniques reference: https://nmap.org/book/man-port-scanning-techniques.html
- Nmap port states reference: https://nmap.org/man/man-port-scanning-basics.html
- Nmap version detection reference: https://nmap.org/book/man-version-detection.html
- Nmap port specification reference: https://nmap.org/book/man-port-specification.html
- Nmap NSE docs: `dns-nsid`, `dns-service-discovery`, `dhcp-discover`, `snmp-info`, `ntp-info`, `tftp-enum`: https://nmap.org/nsedoc/scripts/
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- Net-SNMP `snmpwalk` manual: https://www.net-snmp.org/docs/man/snmpwalk.html
- Net-SNMP `snmpcmd` transport documentation: https://www.net-snmp.org/docs/man/snmpcmd.html
- NTP `sntp` documentation: https://www.ntp.org/documentation/4.2.8-series/sntp/
- NTP `ntpdate` documentation: https://www.ntp.org/documentation/4.2.8-series/ntpdate/
- NTPsec `ntptrace` documentation: https://docs.ntpsec.org/latest/ntptrace.html
- `logger(1)` util-linux local man page and local `logger --help` output

## Issues Found
- The introduction implied that the absence of an ICMP port-unreachable response can establish that a UDP port is open. I changed that wording to describe interpretation of missing or returned ICMP errors, which matches Nmap's documented `open|filtered` behavior.
- The scan-speed explanation said Nmap rate-limits to avoid flooding ICMP replies. Nmap's docs describe the opposite side of the interaction more precisely: many hosts rate-limit ICMP port-unreachable messages, and Nmap slows down accordingly. I corrected that wording in the scan example and conclusion.
- The DNS verification example used `dig +short`, which can suppress useful non-answer replies such as `REFUSED` that still prove UDP/53 is reachable. I changed it to plain `dig` and clarified that any DNS reply confirms the port is open.
- The NTP verification example used `ntpdate -q` and `ntptrace`. The NTP project documents `ntpdate` as deprecated, and `ntptrace` depends on Mode 6 control queries that are commonly disabled. I replaced that example with `sntp`, which is the documented current query client.
- The syslog verification example did not force UDP transport. `logger` will otherwise try UDP first and may fall back to TCP. I added `--udp` and clarified that the message should be confirmed on the server side.
- The DNS NSE example was incorrect. `dns-service-discovery` is for DNS-SD service discovery on port 5353, not classic DNS port 53, and it is unrelated to zone transfers. I replaced it with `dns-nsid` and updated the description accordingly.
- The `snmp-info` and `ntp-info` comments were broader than the official script summaries. I narrowed them to match what those scripts actually return.
- The comment claiming `ls /usr/share/nmap/scripts/ | grep -i udp` lists all UDP-related scripts was misleading. I changed it to accurately describe that it lists filenames containing `udp`.

## Review Notes
- No further technical issues were found after these corrections.
- Several verification commands depend on optional packages (`sntp`, `snmpwalk`) that may not be installed by default on every Linux distribution, but the command syntax and protocol assumptions are correct.
- UDP scans remain inherently ambiguous for many services; even with correct commands, `open|filtered` results still need service-specific follow-up.
