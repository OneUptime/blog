# Validation Summary: How to Switch a Network Adapter from Static IP to DHCP Using netsh

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows networking
- netsh
- ipconfig
- PowerShell NetTCPIP module
- PowerShell DnsClient module
- Batch scripting

## Sources Consulted
- Microsoft Learn: netsh interface commands - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: ipconfig command - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: findstr command - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn: Get-NetAdapter - https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter
- Microsoft Learn: Set-NetIPInterface - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface
- Microsoft Learn: Remove-NetIPAddress - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress
- Microsoft Learn: Set-DnsClientServerAddress - https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress

## Issues Found
- The DNS netsh examples used `netsh interface ipv4 set dns`, but the current Microsoft Learn syntax documents `netsh interface ipv4 set dnsservers`. Updated both DNS netsh examples to use `set dnsservers`.
- The PowerShell example removed all IP addresses on the interface, despite the comment saying it removed static IP entries. Updated it to target manual IPv4 addresses with `-AddressFamily IPv4 -PrefixOrigin Manual`, and added `-AddressFamily IPv4` to the DHCP command to match the post's IPv4 scope.
- The PowerShell renewal command renewed all adapters. Updated it to renew the named adapter used throughout the article.
- The `findstr` verification command used unsupported `\|` alternation. Replaced it with multiple `/c:` search strings, matching the documented `findstr` syntax.
- The batch script parsed only the fourth token from `netsh interface show interface`, which would break interface names containing spaces. Updated the loop to capture the rest of the line as the interface name and changed DNS reset to the documented `dnsservers` form.
- The conclusion showed an incomplete `netsh interface ipv4 set address source=dhcp` command without the required interface name. Updated it to include `name="Ethernet"`.
- The tag list used `Window` instead of `Windows`. Updated the tag to the correct technology name.

## Review Notes
The commands require an elevated Command Prompt or PowerShell session to change adapter settings. The post is technically correct after the fixes above.
