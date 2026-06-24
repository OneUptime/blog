# How to Renew a DHCP Lease on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Window, Networking, Network Diagnostics, Sysadmin

Description: Renewing a DHCP lease on Windows forces the system to release its current IP address and request a new one from the DHCP server, useful when changing networks or resolving IP conflict issues.

For command-line methods, open Command Prompt or PowerShell as Administrator.

## Method 1: ipconfig (Command Prompt)

The most common method:

```cmd
REM Release the current DHCP lease
ipconfig /release

REM Wait a moment, then request a new lease
ipconfig /renew

REM For a specific adapter (replace "Wi-Fi" with your adapter name)
ipconfig /release "Wi-Fi"
ipconfig /renew "Wi-Fi"

REM View the new lease details
ipconfig /all
```

## Method 2: PowerShell

```powershell
# Release all connected IPv4 interfaces that use DHCP
Get-NetIPInterface -AddressFamily IPv4 -Dhcp Enabled -ConnectionState Connected |
    Select-Object -ExpandProperty InterfaceAlias |
    Sort-Object -Unique |
    ForEach-Object {
        ipconfig /release "$_"
    }

# Renew all connected IPv4 interfaces that use DHCP
Get-NetIPInterface -AddressFamily IPv4 -Dhcp Enabled -ConnectionState Connected |
    Select-Object -ExpandProperty InterfaceAlias |
    Sort-Object -Unique |
    ForEach-Object {
        ipconfig /renew "$_"
    }

# Alternative: release and renew specific adapter
$adapter = "Ethernet"
ipconfig /release "$adapter"
ipconfig /renew "$adapter"

# Verify new IPv4 address
Get-NetIPAddress -InterfaceAlias $adapter -AddressFamily IPv4
```

## Method 3: GUI

1. Press `Win + R`, type `ncpa.cpl`, press Enter.
2. Right-click the adapter → **Disable**.
3. Wait 5 seconds, then right-click → **Enable**.
4. If the adapter is configured for DHCP, Windows requests a new lease when it comes back up.

## Method 4: netsh

```cmd
REM Disable and re-enable the adapter, which triggers DHCP again if it uses DHCP
netsh interface set interface name="Ethernet" admin=DISABLED
timeout /t 5
netsh interface set interface name="Ethernet" admin=ENABLED
```

## Flushing DNS Cache After Renewal

If you're also troubleshooting DNS name resolution, flush the DNS cache to remove stale resolver entries:

```cmd
ipconfig /flushdns
```

## Diagnosing Lease Issues

```cmd
REM Show full DHCP lease info
ipconfig /all | findstr /i "dhcp lease gateway dns"

REM Show recent DHCP client events in PowerShell
Get-WinEvent -LogName "Microsoft-Windows-Dhcp-Client/Admin","Microsoft-Windows-Dhcp-Client/Operational" -MaxEvents 10 |
    Select-Object TimeCreated, LogName, Id, LevelDisplayName, Message
```

## Key Takeaways

- `ipconfig /release` followed by `ipconfig /renew` is the standard Windows lease renewal.
- Specify the adapter name if the machine has multiple network interfaces.
- Flush the DNS cache with `ipconfig /flushdns` only when you're also troubleshooting DNS name resolution.
- If renewal fails repeatedly, check DHCP server logs and verify network connectivity.
