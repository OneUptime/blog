# Validation Summary: How to View Active IPv4 Connections with netstat on Windows

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Windows `netstat` command-line utility
- Windows `tasklist` command
- Windows `findstr` command
- PowerShell `Get-NetTCPConnection` cmdlet (NetTCPIP module)
- PowerShell `Get-Process` cmdlet
- TCP connection states (LISTENING, ESTABLISHED, TIME_WAIT, CLOSE_WAIT, FIN_WAIT_2, SYN_SENT)

## Sources Consulted
- Microsoft Learn — netstat command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat
- Microsoft Learn — Get-NetTCPConnection (NetTCPIP module): https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection
- Microsoft Learn — tasklist command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tasklist
- Microsoft Learn — findstr command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- RFC 9293 (TCP) for connection state definitions

## Issues Found
1. **Incorrect IPv4 filter using `findstr ":"`** — The original post showed `netstat -n | findstr ":"` with a comment claiming it filters to IPv4 TCP only. This is incorrect: both IPv4 (e.g., `192.168.1.1:8080`) and IPv6 (e.g., `[::1]:8080`) netstat output lines contain colons, so this filter does not separate the two. Replaced with `netstat -n -p tcp`, which is the official Windows netstat way to filter to IPv4 TCP (the `-p` parameter accepts `TCP`, `UDP`, `TCPv6`, `UDPv6`; `TCP` is IPv4-only). Updated the inline comment accordingly.

## Review Notes
- `netstat -an -p tcp | findstr "LISTENING"` correctly limits output to IPv4 TCP listeners because `-p tcp` is IPv4-only on Windows (use `-p tcpv6` for IPv6).
- `netstat -s -p tcp` correctly reports IPv4 TCP statistics; `-p tcpv6` would be the IPv6 equivalent.
- `netstat -n 3` is valid Windows syntax for continuous refresh every 3 seconds; press Ctrl+C to stop.
- The PowerShell `Get-NetTCPConnection` cmdlet examples are valid and work on Windows 8/Server 2012 and later.
- The `-p` flag on Windows netstat is protocol (TCP/UDP/TCPv6/UDPv6) — note that this is different from Linux/macOS netstat where `-p` typically shows the process/PID.
- The connection-state table is accurate per RFC 9293 / TCP state machine. FIN_WAIT_2 is correctly described as "local end closing" (more precisely, waiting for remote FIN after local close).
- The post appropriately recommends `Get-NetTCPConnection` for richer scripting output, which aligns with modern Windows best practices.
