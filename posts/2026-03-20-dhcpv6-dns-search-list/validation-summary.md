# Validation Summary: How to Configure the DHCPv6 DNS Search List Option

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6
- DNS search list / DHCPv6 option 24
- ISC DHCP (`dhcpd`, `dhclient`)
- Kea DHCPv6
- Windows Server DHCPv6 PowerShell
- Linux and Windows DNS client verification
- `tcpdump` and Wireshark

## Sources Consulted
- RFC 3646, DNS Configuration options for Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc3646
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhclient.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Kea DHCPv6 Administrator Reference Manual: https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- `kea-dhcp6` man page: https://kea.readthedocs.io/en/kea-2.5.3/man/kea-dhcp6.8.html
- Kea `keactrl` and `systemd` guidance: https://kea.readthedocs.io/en/kea-2.6.0/arm/keactrl.html
- Microsoft `Set-DhcpServerv6OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv6optionvalue?view=windowsserver2025-ps
- Microsoft `Get-DhcpServerv6OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv6optionvalue?view=windowsserver2025-ps
- Microsoft `Get-DnsClientGlobalSetting`: https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientglobalsetting?view=windowsserver2025-ps
- Microsoft `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig?view=windows-server-2019
- Wireshark DHCPv6 display filter reference: https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- ISC migration guidance for legacy ISC DHCP deployments: https://www.isc.org/dhcp_migration/

## Issues Found
- The ISC DHCP per-class example used `substring(option dhcp6.client-id, 0, 3) = "server"`, which cannot match because the substring length did not match the comparison string. I changed the substring length to `6` so the example is logically valid.
- The Kea `kea-dhcp6.conf` snippet was incomplete as a standalone configuration. I added `interfaces-config`, `lease-database`, and an explicit subnet `id` so the example aligns with current Kea configuration requirements and avoids deprecated auto-generated subnet IDs.
- The Kea restart command used `kea-dhcp6-server`, which is not the service name used in the official Kea `systemd` examples. I changed it to `kea-dhcp6`.
- The Windows DHCPv6 PowerShell example used `-ScopeId`, which is not the documented parameter for IPv6 scopes on `Set-DhcpServerv6OptionValue` or `Get-DhcpServerv6OptionValue`. I replaced it with `-Prefix` and used the documented `-DomainSearchList` parameter.
- The troubleshooting section suggested `request dhcp6.domain-search`, which is not the documented ISC `dhclient.conf` syntax. I changed it to tell readers to include `domain-search` in the request list and gave the correct ISC example: `also request domain-search;`.

## Review Notes
- ISC DHCP is still relevant for existing environments, but ISC ceased maintaining it in 2022; new deployments should generally prefer Kea.
- The remaining explanations about DHCPv6 option 24, the `domain-search` option name, and the Wireshark filter `dhcpv6.option.type == 24` are consistent with the cited documentation.
