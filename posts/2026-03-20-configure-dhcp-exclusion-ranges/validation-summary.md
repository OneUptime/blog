# Validation Summary: How to Configure DHCP Exclusion Ranges

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- ISC DHCP (`dhcpd`)
- Windows Server DHCP PowerShell (`DhcpServer` module)
- `dnsmasq`
- Python `ipaddress`

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP product page and lifecycle note: https://www.isc.org/dhcp/
- Microsoft Learn, Install and configure DHCP Server on Windows Server: https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server
- Microsoft Learn, `Add-DhcpServerv4ExclusionRange`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4exclusionrange?view=windowsserver2025-ps
- Microsoft Learn, `Get-DhcpServerv4ExclusionRange`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/get-dhcpserverv4exclusionrange?view=windowsserver2025-ps
- Microsoft Learn, `Remove-DhcpServerv4ExclusionRange`: https://learn.microsoft.com/en-us/powershell/module/dhcpserver/remove-dhcpserverv4exclusionrange?view=windowsserver2025-ps
- Official `dnsmasq` man page: https://dnsmasq.org/docs/dnsmasq-man.html
- Python standard library documentation for `ipaddress`: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The `dnsmasq` section said mid-range exclusions should be handled with static hosts or tag-based filtering. I changed this to use multiple `dhcp-range` entries with a gap, because the official `dnsmasq` documentation allows more than one DHCP range in a single subnet and `dhcp-range` defines the dynamic lease pool.
- The ISC `dhcpd` explanation described exclusions too narrowly as multiple ranges "within a pool." I corrected the wording to match ISC's documented behavior: exclusions are created by defining one or more `range` statements and leaving gaps in the allocatable space.
- The Python example did not classify `.201` through `.254` as reserved even though the post's allocation plan marked that block for future static use. I updated the example to label that range consistently.

## Review Notes
- The examples and commands are technically correct after the fixes above.
- ISC DHCP 4.4 syntax in the post matches the official `dhcpd.conf` documentation, but ISC DHCP itself is end-of-life. ISC states that maintenance ended at the end of 2022 and recommends Kea for most new deployments.
- On Windows Server, Microsoft documents reservations as an exception to exclusions: a reserved address can still be leased to its designated client even if it falls inside an exclusion range.
