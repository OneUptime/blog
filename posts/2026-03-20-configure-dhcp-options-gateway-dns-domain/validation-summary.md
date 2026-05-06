# Validation Summary: How to Configure DHCP Options (Gateway, DNS, Domain Name)

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP / DHCPv4 options
- RFC 2132 DHCP option codes
- ISC DHCP (`dhcpd`, `dhclient`)
- `dnsmasq`
- Windows Server DHCP PowerShell
- Windows `ipconfig` and `findstr`
- macOS `ipconfig`

## Sources Consulted
- RFC 2132: DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 `dhclient.leases` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientleases
- `dnsmasq` man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Microsoft Learn: `Set-DhcpServerv4OptionValue`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv4optionvalue?view=windowsserver2025-ps
- Microsoft Learn: Deploy DHCP Using Windows PowerShell: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-deploy-wps
- Microsoft Learn: `findstr`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr

## Issues Found
- The `dnsmasq` example used `tag:`-scoped DHCP options without showing matching `dhcp-range=set:<tag>,...` declarations. I added matching ranges and changed the note from "per-interface" to "per-range" because `dnsmasq` applies these options from tags set on ranges or hosts.
- The Windows verification example used `findstr -i "gateway\|dns\|domain"`. Microsoft documents only a limited regex set for `findstr`, and `|` alternation is not supported. I replaced it with `/c:` searches for the actual `ipconfig /all` labels.
- The Linux verification note described `dhclient -v` as a way to "view all DHCP options received." ISC documents `-v` as verbose logging during acquisition, so I changed the example to `dhclient -1 -v eth0` and clarified that the lease file is the reliable place to inspect received data.
- The post described the router option as "required" and the takeaway implied options 3 and 6 alone were the minimum. I corrected this to reflect that normal internet access also depends on a subnet mask, and that option 3 is specifically needed for routed connectivity.
- I tightened the option 15 wording from "DNS search domain" to "client DNS suffix" so it matches RFC 2132's single-domain behavior more closely.

## Review Notes
- ISC DHCP is end-of-life according to ISC's own documentation. The configuration syntax in the post is still valid for existing deployments, but new deployments typically use an actively maintained DHCP server such as Kea.
- DHCP option 15 carries one domain suffix. If a deployment needs multiple DNS search domains, DHCP option 119 is the relevant mechanism.
