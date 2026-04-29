# How to Monitor IPv6 Connections on Windows with netstat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, netstat, Network Monitoring, Command Line

Description: Learn how to use netstat to monitor IPv6 network connections on Windows, view listening ports, active sessions, and connection statistics for IPv6 traffic.

## Basic netstat IPv6 Commands

```cmd
:: Show all active TCP connections including IPv6
netstat -a

:: Show all IPv6 connections specifically
:: (netstat doesn't have a -6 flag like Linux ss)
:: Filter with findstr for IPv6 addresses (lines with brackets)
netstat -an | findstr "\[.*\]"

:: Or filter by IPv6 protocols directly
netstat -an -p TCPv6
netstat -an -p UDPv6

:: Show connections with numeric addresses and ports (no DNS resolution)
netstat -an

:: Show process IDs
netstat -ano
```

## Understanding netstat Output for IPv6

```text
Proto  Local Address              Foreign Address            State
TCP    [::]:80                    [::]:0                     LISTENING
TCP    [::]:443                   [::]:0                     LISTENING
TCP    [2001:db8::10]:443         [2001:db8::20]:51234       ESTABLISHED
TCP    [::1]:5432                 [::1]:54321                ESTABLISHED
UDP    [::]:53                    *:*
```

IPv6 addresses in netstat output are enclosed in brackets `[...]`:
- `[::]:80` - Listening on all IPv6 addresses, port 80
- `[::1]:5432` - Loopback address with port
- `[2001:db8::10]:443` - Specific global IPv6 address

## Filtering IPv6 Connections

```cmd
:: Show only listening IPv6 ports
netstat -an | findstr "LISTENING" | findstr "\[.*\]"

:: Show only established IPv6 connections
netstat -an | findstr "ESTABLISHED" | findstr "\[.*\]"

:: Show connections on a specific IPv6 port
netstat -an | findstr ":443" | findstr "\[.*\]"

:: Show connections to a specific IPv6 address
netstat -an | findstr "2001:db8::10"
```

## Show Processes with IPv6 Connections

```cmd
:: Show process IDs for IPv6 connections
netstat -ano | findstr "\[.*\]"

:: Cross-reference PID with process name
netstat -ano | findstr ":443.*\[.*\]"
tasklist /FI "PID eq 1234"

:: Combined: show IPv6 connections with process names
netstat -b -an 2>nul | findstr "\[.*\]"
```

## PowerShell Alternative (More Powerful)

```powershell
# Show all IPv6 TCP connections

Get-NetTCPConnection | Where-Object {
    $_.LocalAddress -like "*:*" -or $_.RemoteAddress -like "*:*"
}

# Show only established IPv6 TCP connections
Get-NetTCPConnection -State Established |
    Where-Object {$_.LocalAddress -notlike "0.0.0.0" -and $_.LocalAddress -notlike "127.*"} |
    Where-Object {$_.LocalAddress -like "*:*"} |
    Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State

# Show listening IPv6 ports with owning process
Get-NetTCPConnection -State Listen |
    Where-Object {$_.LocalAddress -eq "::"} |
    Select-Object LocalPort, @{N="Process"; E={(Get-Process -Id $_.OwningProcess).Name}}
```

## Connection Statistics

```cmd
:: Show IPv6-specific statistics
netstat -s -p IPv6

:: Output includes:
:: IPv6 Statistics
::   Packets Received        = 12345
::   Received Header Errors  = 0
::   Received No Routes      = 0
::   ...

:: Show ICMPv6 statistics
netstat -s -p ICMPv6
```

## Monitoring in Real Time

```powershell
# Watch IPv6 connections refresh every 2 seconds
watch -n 2 "netstat -an | findstr '\[.*\]'"  # Not native in Windows

# PowerShell loop equivalent
while ($true) {
    Clear-Host
    Get-NetTCPConnection -State Established |
        Where-Object {$_.LocalAddress -like "*:*"} |
        Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort |
        Format-Table -AutoSize
    Start-Sleep -Seconds 2
}

# Count active IPv6 connections
(Get-NetTCPConnection -State Established |
    Where-Object {$_.LocalAddress -like "*:*"}).Count
```

## Summary

Monitor IPv6 connections on Windows with `netstat -an | findstr "\[.*\]"` to filter IPv6 addresses (shown in brackets). Use `netstat -ano` to see process IDs. For more powerful querying, use PowerShell `Get-NetTCPConnection | Where-Object {$_.LocalAddress -like "*:*"}`. View statistics with `netstat -s -p IPv6`. For real-time monitoring and scripting, PowerShell `Get-NetTCPConnection` provides structured output that's easier to filter and process.
