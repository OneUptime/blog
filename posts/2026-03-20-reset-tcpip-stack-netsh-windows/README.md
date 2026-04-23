# How to Reset TCP/IP Stack with netsh on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netsh, TCP/IP, Window, Network Reset, Winsock

Description: Learn how to use netsh commands to fully reset the Windows TCP/IP stack and Winsock catalog, fixing corrupted network configurations that cause persistent connectivity failures.

## When to Reset the TCP/IP Stack

Reset the TCP/IP stack when you experience:
- No internet despite being connected
- "Ethernet doesn't have a valid IP configuration"
- Connections that appear active but don't transfer data
- Issues after malware removal or failed VPN uninstall
- Network problems that persist after driver updates

## Step 1: Full TCP/IP and Winsock Reset

```cmd
REM Run Command Prompt as Administrator (crucial - will fail otherwise)

REM Reset Winsock catalog (fixes LSP/layered service provider corruption)
netsh winsock reset

REM Reset IPv4 TCP/IP stack
netsh int ip reset reset.log

REM Reset IPv6 TCP/IP stack
netsh interface ipv6 reset

REM Flush DNS resolver cache
ipconfig /flushdns

REM Re-register DNS names
ipconfig /registerdns

REM Release and renew DHCP lease
ipconfig /release
ipconfig /renew

REM REBOOT IS REQUIRED
shutdown /r /t 0
```

## Step 2: Verify Reset Log

```cmd
REM After reboot, review what was reset
type reset.log

REM Example output:
REM reset SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\{GUID}\EnableDhcp
REM old REG_DWORD = 0
REM <completed>
```

## Step 3: Using PowerShell Session Alternative

```powershell
# PowerShell session alternative (Windows 8/10/11)

# Run as Administrator

# Reset Winsock and TCP/IP
netsh winsock reset
netsh int ip reset

# Optional: remove IP addresses and the IPv4 default route for a deeper rebuild
Get-NetAdapter | ForEach-Object {
    $name = $_.Name
    Remove-NetIPAddress -InterfaceAlias $name -Confirm:$false -ErrorAction SilentlyContinue
    Remove-NetRoute -InterfaceAlias $name -DestinationPrefix "0.0.0.0/0" -Confirm:$false -ErrorAction SilentlyContinue
}

# Flush DNS
Clear-DnsClientCache

# Re-register DNS names
Register-DnsClient

# Inspect DNS cache entries after reset
Get-DnsClientCache
```

## Step 4: Reset Network Using Windows Settings (GUI)

```text
Get Help → search for "connect to network and internet"
→ Run network diagnostics

Or for full reset:
Settings → Network & Internet → Advanced network settings
→ Network reset → Reset now

WARNING: Network reset removes network adapters and their settings, and you might need to reinstall VPN client software afterward
```

## Step 5: Reset Individual Components

```cmd
REM Reset only Winsock (less disruptive)
netsh winsock reset

REM Reset TCP/IP stack
netsh int ip reset

REM Reset firewall policies to defaults
netsh advfirewall reset

REM Prefer IPv4 over IPv6 instead of disabling IPv6 outright (requires reboot)
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" /v DisabledComponents /t REG_DWORD /d 32 /f
```

## Step 6: Check What Gets Reset

The `netsh int ip reset` command modifies these registry keys:

```cmd
REM Keys affected by netsh int ip reset:
REM HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters
REM HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\DHCP\Parameters

REM View current values before reset (for documentation)
reg query "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
```

## Step 7: Post-Reset Verification

```cmd
REM Verify TCP/IP stack is functional after reboot
ipconfig /all

REM Test connectivity layers
ping 127.0.0.1             REM IPv4 loopback
ping <your-default-gateway> REM Gateway
ping 8.8.8.8               REM Internet
nslookup google.com        REM DNS

REM Review Winsock providers
netsh winsock show catalog
REM Unexpected third-party LSPs from old VPN/AV software can indicate leftover Winsock entries
```

## Conclusion

The full TCP/IP reset sequence is `netsh winsock reset` + `netsh int ip reset reset.log` + `netsh interface ipv6 reset` + `ipconfig /flushdns` + reboot. This fixes most persistent Windows network issues by returning the TCP/IP stack to a clean state. Check the `reset.log` file after reboot to confirm which settings were changed. The network stack reset via Settings → Network reset also reinstalls network adapters and resets their settings, so you may need to reinstall VPN client software afterward.
