# Validation Summary: How to Configure Dual-Stack on Windows Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Server networking
- IPv4 and IPv6 dual-stack configuration
- PowerShell (`NetTCPIP`, `DnsClient`, `NetSecurity`, `NetworkTransition`)
- `netsh` networking commands
- IIS binding behavior

## Sources Consulted
- Microsoft Learn, `Get-NetRoute` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps
- Microsoft Learn, `New-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Remove-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Set-DnsClientServerAddress` - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn, `Set-NetIPInterface` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn, `Set-NetIPv6Protocol` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipv6protocol?view=windowsserver2025-ps
- Microsoft Learn, `New-NetFirewallRule` - https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2025-ps
- Microsoft Learn, `netsh interface` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, Guidance for configuring IPv6 in Windows for advanced users - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn, `Get-NetPrefixPolicy` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netprefixpolicy?view=windowsserver2025-ps
- Microsoft Learn, Dual-Stack Sockets for IPv6 Winsock Applications - https://learn.microsoft.com/en-us/windows/win32/winsock/dual-stack-sockets
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc6724

## Issues Found
- The route-checking example claimed to show routes for both families, but the command filtered on `::` and therefore only showed IPv6 routes. I removed the filter and included `AddressFamily` in the selected output.
- The IPv6 cleanup step used `Remove-NetIPAddress -AddressFamily IPv6` without narrowing the target, which could remove all IPv6 addresses on the interface instead of just a manually configured one. I changed it to remove only IPv6 addresses with `PrefixOrigin Manual`.
- The `netsh` examples used syntax that did not match Microsoft's current command reference. I updated the examples to documented forms, including `ipv6 add address`, `ipv6 add route prefix=... interface=... nexthop=...`, and `set dnsservers`.
- The dynamic-addressing section used `Set-NetIPv6Protocol -RouterDiscovery Enabled`, but Microsoft documents no `-RouterDiscovery` parameter for `Set-NetIPv6Protocol`. I replaced it with `Set-NetIPInterface -RouterDiscovery Enabled` and changed the DHCPv6 guidance to inspecting the interface's managed and other-stateful DHCPv6 settings.
- The address-preference section attributed Windows behavior directly to RFC 6724. Current Microsoft Windows documentation describes the behavior in terms of the Windows prefix policy table and still references RFC 3484 terminology. I reworded the section to describe Windows prefix policies without making an unsupported version-specific RFC claim, and I updated the `set prefixpolicy` example to documented named syntax.
- The firewall example used a nonexistent `-AddressFamily` parameter on `New-NetFirewallRule`. I removed that parameter.
- The firewall example also used `fd00:mgmt::/48`, which is not a valid IPv6 prefix because `mgmt` is not hexadecimal. I replaced it with the valid sample ULA prefix `fd00:1234::/48`.
- The summary implied that correct dual-stack validation always requires both `:::port` and `0.0.0.0:port` listeners. Microsoft Winsock documentation notes that listener behavior varies depending on whether the application uses separate sockets or an IPv6 dual-stack socket, so I corrected the wording accordingly.
- The metadata tag `Window` was corrected to `Windows`.

## Review Notes
- Microsoft guidance for modern Windows Server says IPv6 is a mandatory platform component and recommends preferring IPv4 through prefix policy changes rather than disabling IPv6 outright.
- Microsoft also notes that ISATAP and Teredo are disabled by default on modern Windows; the post's disable commands remain valid as explicit hardening steps.
- The sample addressing uses documentation-safe ranges (`192.0.2.0/24`, `2001:db8::/32`) and a sample ULA prefix, which is appropriate for a tutorial.
