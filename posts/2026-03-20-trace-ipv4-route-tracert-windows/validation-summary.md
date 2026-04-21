# Validation Summary: How to Trace an IPv4 Route with tracert on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows tracert
- IPv4
- ICMP Echo, ICMP Time Exceeded, and TTL behavior
- PowerShell Test-NetConnection
- Windows cmd

## Sources Consulted
- Microsoft Learn: tracert command: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- Microsoft Learn: Test-NetConnection cmdlet: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn: pathping command: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pathping
- RFC 792: Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812: Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812

## Issues Found
- Corrected the tag `Window` to `Windows` to match the platform covered by the article.
- Changed wording that implied `tracert` directly identifies packet loss. Microsoft documents `pathping` as the Windows tool that computes packet-loss statistics; `tracert` shows hop responses and timeouts.
- Clarified that `* * *` means no response before the timeout and can be caused by ICMP filtering, ICMP rate limiting, or response timeout, not only firewall filtering.
- Reworded failure and congestion guidance to avoid presenting `tracert` output as definitive proof of a failed hop or congestion point. ICMP handling and return-path behavior can affect results.
- Replaced the PowerShell `Start-Process cmd` example with `cmd /c tracert -d 8.8.8.8` so the command runs directly in the current PowerShell session.

## Review Notes
The `tracert` option examples, default maximum hop count, timeout units, IPv4 forcing option, and PowerShell `Test-NetConnection -TraceRoute` usage were verified as current and accurate.
