# Validation Summary: How to Release and Renew a DHCP IPv4 Address with ipconfig

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows `cmd.exe`
- `ipconfig`
- DHCP
- IPv4
- Windows PowerShell
- CIM/WMI networking classes

## Sources Consulted
- Microsoft Learn: `ipconfig` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `rem` command reference - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/rem
- Microsoft Learn: `Get-NetIPInterface` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `Invoke-CimMethod` - https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/invoke-cimmethod?view=powershell-7.5
- Microsoft Learn: `Win32_NetworkAdapterConfiguration` class - https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkadapterconfiguration
- Microsoft Learn: `ReleaseDHCPLease` method - https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/releasedhcplease-method-in-class-win32-networkadapterconfiguration
- Microsoft Learn: `RenewDHCPLease` method - https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/renewdhcplease-method-in-class-win32-networkadapterconfiguration
- Microsoft Learn: Troubleshoot problems on the DHCP client - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/troubleshoot-problems-dhcp-client
- Microsoft Learn: How to use automatic TCP/IP addressing without a DHCP server - https://learn.microsoft.com/en-us/windows-server/troubleshoot/how-to-use-automatic-tcpip-addressing-without-a-dh
- Microsoft Learn: DHCP scopes in Windows Server - https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-scopes
- RFC 2131: Dynamic Host Configuration Protocol - https://www.rfc-editor.org/rfc/rfc2131

## Issues Found
- The post said `ipconfig /renew` gives each adapter a new IP. I changed this to say it renews DHCP configuration and may return the same IPv4 address or a different one, because renewal does not guarantee a different lease.
- The adapter-name guidance pointed readers to `ipconfig /all`. I changed it to `ipconfig`, which is what Microsoft documents for adapter names used with `/release` and `/renew`.
- The APIPA explanation was tightened to describe the `169.254.x.x` result after a failed renewal more precisely, and `net start dhcp` was changed to `net start "DHCP Client"` for clarity with the documented service display name.
- The `cmd` examples used `::` comments, including an inline `::` after `ping`. I replaced these with `REM`, which is the documented `cmd.exe` comment command and avoids invalid or misleading command examples.
- The PowerShell sample incorrectly used `Invoke-CimMethod -ClassName ... -Filter` for instance methods and filtered on `Index` using an interface index value. I replaced it with a working pattern: get the IPv4 interface index, fetch the matching `Win32_NetworkAdapterConfiguration` instance, then call `Invoke-CimMethod -InputObject` for `ReleaseDHCPLease` and `RenewDHCPLease`.
- The DHCP reservation section implied the client can force a specific DHCP address. I corrected the wording to explain that the DHCP server leases the reserved IP to the matching client and that release/renew helps the client pick up the reservation.

## Review Notes
- The post is correctly scoped to IPv4. Microsoft documents separate `/release6` and `/renew6` commands for DHCPv6, so not covering IPv6 here is appropriate.
