# Validation Summary: How to Troubleshoot DHCP Server Not Responding

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- DHCP/BOOTP protocol behavior
- IPv4 link-local/APIPA addressing
- ISC DHCP Server (`dhcpd`)
- dnsmasq
- Windows Server DHCP
- Linux networking tools (`ss`, `iptables`, `ip`, `dhclient`)
- Nmap NSE DHCP discovery
- `dhcping`

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/rfc2131/
- RFC 3927, Dynamic Configuration of IPv4 Link-Local Addresses: https://datatracker.ietf.org/doc/html/rfc3927
- Microsoft Learn, DHCP server events in Windows Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-server-events
- Microsoft Learn, Guidance for troubleshooting DHCP: https://learn.microsoft.com/en-au/troubleshoot/windows-server/networking/troubleshoot-dhcp-guidance
- Microsoft Learn, `Get-WinEvent`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent
- Microsoft Learn, `Get-Service`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service
- Microsoft Learn, `Get-NetFirewallRule`: https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewallrule
- Microsoft Learn, `Get-DhcpServerv4ScopeStatistics`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4scopestatistics
- Nmap NSE documentation, `broadcast-dhcp-discover`: https://nmap.org/nsedoc/scripts/broadcast-dhcp-discover.html
- ISC DHCP 4.4 manual page, `dhcpd.leases`: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP 4.4 manual page, `dhcpd.conf`: https://kb.isc.org/v1/docs/isc-dhcp-44-manual-pages-dhcpdconf
- dnsmasq manual page: https://dnsmasq.org/docs/dnsmasq-man.html
- Debian man page, `dhcping(8)`: https://manpages.debian.org/unstable/dhcping/dhcping.8.en.html
- Debian man page, `iptables-extensions(8)`: https://manpages.debian.org/unstable/iptables/iptables-extensions.8.en.html
- Ubuntu Server documentation, About DHCP: https://ubuntu.com/server/docs/explanation/networking/about-dhcp/
- Local command help output for `ss --help` and `iptables --help`

## Issues Found
- Replaced the Windows DHCP event log example with `Get-WinEvent -LogName "Microsoft-Windows-DHCP Server Events/Operational" -MaxEvents 20`. Microsoft documents DHCP Server events under the DHCP-Server event channels, and `Get-WinEvent` is the current cmdlet for modern Windows event logs.
- Replaced the loose `ss -ulnp | grep 67` and deprecated `netstat` fallback with `sudo ss -ulnp 'sport = :67'` and an `ss` process-name filter. This avoids false matches and uses the current Linux socket inspection tool.
- Corrected the Linux firewall allow example for DHCP server replies. DHCP clients send to server UDP port 67, and servers reply from UDP port 67 to client UDP port 68, so the port 68 rule belongs on outbound server traffic when an OUTPUT policy is restrictive.
- Changed the ISC lease-file count from counting every `lease` declaration to estimating active lease records with `binding state active`. ISC documents `dhcpd.leases` as log-structured, so counting all lease declarations is not an active lease count.
- Added the required `-c client-IP-address` argument to the `dhcping` example and clarified that the client IP/MAC must be valid for the tested scope or reservation.
- Reworded the rogue DHCP server note. Multiple offers can be intentional in some designs, so an unexpected offer should be investigated as a rogue or misconfigured server rather than treated as automatically rogue.

## Review Notes
- ISC DHCP is end-of-life upstream, and Ubuntu documents `isc-dhcp-server` as deprecated and unsupported since Ubuntu 24.04 LTS. The ISC examples are still valid for existing deployments, but a future update could add Kea DHCP Server coverage.
- The direct `iptables` examples are valid where iptables controls the packet filter. Some systems use nftables, firewalld, or ufw as the primary firewall interface.
- The `dhclient` example is valid for ISC dhclient, but some modern Linux installations rely on NetworkManager or systemd-networkd DHCP clients instead.
