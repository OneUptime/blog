# Validation Summary: How to Detect Unauthorized IPv6 Tunnels on Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 transition tunnels: 6in4, SIT, 6to4, ISATAP, and Teredo
- GRE tunneling
- `tcpdump` and libpcap capture filters
- NetFlow / IPFIX analysis with `nfdump`
- Suricata rule syntax
- Linux `iproute2`, `lsmod`, and `auditd` workflows
- Windows PowerShell `NetAdapter` and `NetworkTransition` cmdlets
- DNS monitoring with BIND query logs
- Splunk SPL

## Sources Consulted
- RFC 4213, Basic Transition Mechanisms for IPv6 Hosts and Routers: https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 3056, Connection of IPv6 Domains via IPv4 Clouds: https://www.rfc-editor.org/rfc/rfc3056
- RFC 3068, An Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc3068
- RFC 4380, Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs): https://www.rfc-editor.org/rfc/rfc4380
- RFC 5214, Intra-Site Automatic Tunnel Addressing Protocol (ISATAP): https://www.rfc-editor.org/rfc/rfc5214.html
- RFC 7526, Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526.html
- RFC 9099, Operational Security Considerations for IPv6 Networks: https://www.rfc-editor.org/rfc/rfc9099.html
- `pcap-filter(7)`: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ip-tunnel(8)`: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Suricata rules documentation: https://docs.suricata.io/en/suricata-7.0.15/rules/index.html
- Suricata DNS keywords documentation: https://docs.suricata.io/en/suricata-7.0.15/rules/dns-keywords.html
- `Get-NetAdapter` documentation: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- `Get-NetTeredoConfiguration` documentation: https://learn.microsoft.com/en-us/powershell/module/networktransition/get-netteredoconfiguration?view=windowsserver2025-ps
- `Get-Net6to4Configuration` documentation: https://learn.microsoft.com/en-us/powershell/module/networktransition/get-net6to4configuration?view=windowsserver2025-ps
- `Get-NetIsatapConfiguration` documentation: https://learn.microsoft.com/en-us/powershell/module/networktransition/get-netisatapconfiguration?view=windowsserver2025-ps
- `nfdump` official repository and usage examples: https://github.com/phaag/nfdump

## Issues Found
- The Linux section said `ip tunnel show` would list all tunnel interfaces, but `iproute2` uses the encapsulating address family and the default view is IPv4. I added `ip -6 tunnel show` and updated the summary so the guidance now covers IPv6-outer tunnels as well.
- The Linux investigation comments implied that `last` shows root commands or processes using tunnel interfaces. I corrected that wording so it accurately describes `last` as session history and `ausearch` as audit-log correlation for `iproute2` activity.
- The cron example was labeled as tunnel creation detection but actually diffed current state, and it ignored the IPv6 tunnel view. I corrected it to monitor both `ip tunnel show` and `ip -6 tunnel show`, require a baseline file, and alert only when the captured state changes.
- The `nfdump` examples used `dport` shorthand. I changed those filters to the documented `dst port` form used in the upstream `nfdump` examples.
- The Windows adapter audit did not include hidden adapters even though Microsoft documents that `Get-NetAdapter` returns only visible adapters by default. I changed it to use `-IncludeHidden`.
- The Windows CSV export used `/tmp/tunnel-audit.csv`, which is not a normal Windows path. I changed it to `$env:TEMP\tunnel-audit.csv`.
- The ISATAP DNS section said clients query `isatap.<domain>` to find the router as if that name were mandatory. RFC 5214 describes `isatap.domainname` as a common convention for publishing the Potential Router List, not a required naming rule, so I corrected that statement.
- I added small accuracy notes where the examples depended on historical or deployment-specific behavior: 6to4 relay anycast traffic is legacy, and the Splunk field names depend on the NetFlow ingest schema.

## Review Notes
- The post is technically sound after the fixes, but several example paths and field names remain environment-specific by design, including `eth0`, `/var/cache/nfdump/nfcapd.current`, `/var/log/named/query.log`, and the Splunk NetFlow fields.
- 6to4 relay anycast (`192.88.99.0/24`, commonly `192.88.99.1`) has been deprecated for modern operating systems, but it is still worth monitoring in legacy environments because stray or unauthorized transition traffic can still appear.
