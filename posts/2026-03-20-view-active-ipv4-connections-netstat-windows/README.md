# How to View Active IPv4 Connections with netstat on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, netstat, IPv4, Connection, Diagnostic

Description: Use netstat on Windows to display active IPv4 TCP connections, listening ports, process associations, and connection state information for network troubleshooting.

## Introduction

`netstat` (network statistics) displays active connections, listening ports, and network statistics on Windows. It is essential for identifying what services are running, what connections a process has made, and detecting unexpected network activity.

## Show All Active IPv4 Connections

```cmd
:: Show all active TCP connections (IPv4 and IPv6)
netstat -n

:: IPv4 TCP only (-p tcp filters to IPv4; use tcpv6 for IPv6)
netstat -n -p tcp
```

## Show All Listening Ports

```cmd
:: Show listening (server) ports
netstat -an | findstr "LISTENING"

:: Show only listening TCP IPv4 ports
netstat -an -p tcp | findstr "LISTENING"
```

## Show Ports with Process IDs

```cmd
:: Show connection + PID
netstat -ano

:: Find which process owns port 8080
netstat -ano | findstr ":8080"
```

Then look up the PID:

```cmd
:: Find the process name for a PID (e.g., PID 1234)
tasklist | findstr "1234"
```

## Continuous Monitoring

```cmd
:: Refresh every 3 seconds
netstat -n 3
```

## Filtering by State

```cmd
:: Show only ESTABLISHED connections
netstat -an | findstr "ESTABLISHED"

:: Show only TIME_WAIT connections (delayed close)
netstat -an | findstr "TIME_WAIT"

:: Show only CLOSE_WAIT (remote end closed)
netstat -an | findstr "CLOSE_WAIT"
```

## Showing Protocol Statistics

```cmd
:: Show IPv4 TCP statistics
netstat -s -p tcp

:: Show IPv4 UDP statistics
netstat -s -p udp
```

## Understanding Connection States

| State | Meaning |
|---|---|
| LISTENING | Waiting for incoming connections |
| ESTABLISHED | Active connection |
| TIME_WAIT | Connection closed, waiting for late packets |
| CLOSE_WAIT | Remote end closed, local still open |
| FIN_WAIT_2 | Local end closing |
| SYN_SENT | Attempting to connect |

## PowerShell Alternative

```powershell
# Get all TCP connections with process names

Get-NetTCPConnection | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess |
    Sort-Object LocalPort | Format-Table -AutoSize

# Get only listening ports with process names
Get-NetTCPConnection -State Listen |
    Select-Object LocalAddress, LocalPort, @{n="Process";e={(Get-Process -Id $_.OwningProcess).Name}} |
    Sort-Object LocalPort
```

## Common netstat Flags Summary

| Flag | Meaning |
|---|---|
| `-a` | All connections and listeners |
| `-n` | Numeric (no reverse DNS) |
| `-o` | Show owning PID |
| `-s` | Protocol statistics |
| `-p tcp` | Filter to TCP |
| `-e` | Interface statistics |

## Conclusion

`netstat -ano` is the most practical netstat command - it shows all connections with ports and PIDs numerically. Combine with `tasklist | findstr <PID>` to identify which application owns a connection. Use PowerShell's `Get-NetTCPConnection` for richer, filterable output.
