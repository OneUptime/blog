# Validation Summary: How to Configure the IPv6 Policy Table on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows IPv6 prefix policy table
- `netsh interface ipv6`
- PowerShell / NetTCPIP cmdlets
- Group Policy and Windows registry (`DisabledComponents`)
- IPv6 address selection policy

## Sources Consulted
- Microsoft Learn: `netsh interface` command reference
  https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `Get-NetPrefixPolicy`
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netprefixpolicy
- Microsoft Learn: `Get-NetIPv6Protocol`
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipv6protocol
- Microsoft Learn: `Find-NetRoute`
  https://learn.microsoft.com/en-us/powershell/module/nettcpip/find-netroute
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users
  https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: `Dns.GetHostAddresses`
  https://learn.microsoft.com/en-us/dotnet/api/system.net.dns.gethostaddresses
- Microsoft Learn: `Socket.Connect`
  https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.socket.connect
- Microsoft Learn: `MSFT_NetPrefixPolicy` class
  https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/nettcpipprov/msft-netprefixpolicy
- RFC 6724: Default Address Selection for IPv6
  https://www.rfc-editor.org/rfc/rfc6724

## Issues Found
- The post used `Get-NetIPv6Protocol` to view prefix policies. That cmdlet exposes global IPv6 protocol configuration, not the prefix policy table. I replaced it with `Get-NetPrefixPolicy`.
- The post used `netsh interface ipv6 add prefixpolicy` to modify the built-in `::ffff:0:0/96` entry. Current Microsoft documentation distinguishes `add prefixpolicy` for new entries from `set prefixpolicy` for modifying an existing entry. I corrected the built-in-entry examples to use `set`.
- The post said deleting `::ffff:0:0/96` would revert to default. That is not a safe way to restore the built-in mapping entry. I changed the restore examples to set the entry back to `precedence=35 label=4`.
- The post described `netsh interface ipv6 reset` as resetting only prefix policies to RFC 6724 defaults. Microsoft documents `ipv6 reset` as removing all user-configured IPv6 settings and restoring defaults after a restart. I corrected that scope and restart requirement everywhere it appeared.
- The automation script always used `add prefixpolicy`, which would conflict with existing built-in entries. I updated the script to use `set` when a prefix already exists and `add` only when it is missing.
- The post claimed Windows implements RFC 6724 directly. Current Microsoft documentation describes Windows as using a configurable prefix policy table and references RFC 3484 in the PowerShell and troubleshooting guidance. I removed the unsupported implementation claim from the introduction.
- The UDP `Socket.Connect()` example was presented as a reliable way to inspect the selected source address without sending traffic. The .NET documentation for connectionless sockets does not support that usage as a dependable source-selection test. I replaced it with `Find-NetRoute -RemoteIPAddress ...`, which Microsoft documents specifically for finding the best local IP address and route.
- The Group Policy startup-script snippet only assigned a here-string to a variable and did not show executable script content. I changed it to the actual command that should be placed in the startup script.
- The DNS-order verification comments were too absolute. I softened them so they are framed as quick resolver-order checks rather than guaranteed proof for every application.

## Review Notes
- I validated the post against current Microsoft Learn and RFC sources on April 30, 2026, and then corrected the README directly.
- I did not execute the Windows commands in this workspace because the review environment is not Windows; validation of command behavior was documentation-based.
- Microsoft currently recommends preferring IPv4 via prefix policy changes or `DisabledComponents=0x20` rather than unbinding or disabling IPv6 broadly, because some Windows components expect IPv6 to remain available.
