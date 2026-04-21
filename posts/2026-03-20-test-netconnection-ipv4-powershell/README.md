# How to Use Test-NetConnection for IPv4 Connectivity Testing in PowerShell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, PowerShell, Networking, IPv4, Test-NetConnection, Diagnostic

Description: Test IPv4 connectivity, port reachability, and route tracing using PowerShell's Test-NetConnection cmdlet for comprehensive network diagnostics beyond basic ping.

## Introduction

`Test-NetConnection` is a versatile PowerShell cmdlet that tests ICMP reachability, TCP port connectivity, and route tracing in one tool. It is the PowerShell equivalent of combining `ping`, `tracert`, and `telnet` into a single command.

## Basic ICMP Ping Test

```powershell
# Simple connectivity test (ICMP ping)

Test-NetConnection -ComputerName 8.8.8.8

# Test by hostname
Test-NetConnection -ComputerName google.com
```

Output:

```text
ComputerName     : google.com
RemoteAddress    : 142.250.80.46
PingSucceeded    : True
PingReplyDetails (RTT) : 11 ms
```

## Testing a Specific TCP Port

```powershell
# Test if port 443 is open on a host
Test-NetConnection -ComputerName example.com -Port 443

# Test SSH port
Test-NetConnection -ComputerName 192.168.1.50 -Port 22
```

Output for a successful TCP test:

```text
ComputerName     : 192.168.1.50
RemoteAddress    : 192.168.1.50
RemotePort       : 22
TcpTestSucceeded : True
```

## Tracing the Route

```powershell
# Trace the full path to a destination
Test-NetConnection -ComputerName 8.8.8.8 -TraceRoute
```

## Scripting with Test-NetConnection

```powershell
# Check multiple hosts and ports, return structured results
$targets = @(
    @{Host="192.168.1.10"; Port=22},
    @{Host="192.168.1.20"; Port=80},
    @{Host="8.8.8.8";      Port=53}
)

foreach ($t in $targets) {
    $result = Test-NetConnection -ComputerName $t.Host -Port $t.Port -WarningAction SilentlyContinue
    [PSCustomObject]@{
        Host    = $t.Host
        Port    = $t.Port
        Success = $result.TcpTestSucceeded
        RTT     = $result.PingReplyDetails.RoundtripTime
    }
} | Format-Table -AutoSize
```

## Quiet Mode for Scripting

```powershell
# Returns True/False - suppress all output except the boolean
$reachable = Test-NetConnection -ComputerName 8.8.8.8 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($reachable) {
    Write-Host "Host is UP"
} else {
    Write-Host "Host is DOWN"
}
```

## Checking Multiple Ports on a Single Host

```powershell
# Check all common service ports on a server
$targetHost = "192.168.1.100"
$ports = @(22, 80, 443, 3389, 5432)

$ports | ForEach-Object {
    $r = Test-NetConnection -ComputerName $targetHost -Port $_ -WarningAction SilentlyContinue
    "$targetHost`:$_ = $(if ($r.TcpTestSucceeded) {'OPEN'} else {'CLOSED'})"
}
```

## Common Use Cases

| Scenario | Command |
|---|---|
| Check if web server is up | `Test-NetConnection example.com -Port 443` |
| Verify RDP port open | `Test-NetConnection SERVER -Port 3389` |
| Test database reachability | `Test-NetConnection dbserver -Port 5432` |
| Trace connectivity path | `Test-NetConnection 8.8.8.8 -TraceRoute` |

## Conclusion

`Test-NetConnection` with `-Port` is the single most useful PowerShell network diagnostic tool, replacing both `ping` and `telnet` for connectivity testing. Combine with `-TraceRoute` to get path information, and use `-WarningAction SilentlyContinue` in scripts to suppress warning messages.
