# How to Fix 'WiFi Doesn't Have a Valid IP Configuration' on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, Window, IP Configuration, DHCP, Troubleshooting

Description: Learn how to fix the 'WiFi doesn't have a valid IP configuration' error on Windows by resetting the network stack, flushing DHCP, and reconfiguring the wireless adapter.

## What Causes This Error?

The "WiFi doesn't have a valid IP configuration" error appears when Windows cannot obtain a valid IPv4 address from the DHCP server, or the IP configuration is corrupted. Common causes:

- DHCP server unavailable or lease exhausted
- Corrupted TCP/IP stack settings
- Driver issues with the wireless adapter
- IP address conflict on the network
- Previous static IP configuration interfering

## Step 1: Release and Renew IP Address

Open Command Prompt as Administrator:

```cmd
REM Release current IP address
ipconfig /release

REM Flush DNS cache
ipconfig /flushdns

REM Renew IP address from DHCP
ipconfig /renew

REM Check if an IP was assigned
ipconfig /all
```

If an IP is now assigned and the gateway is reachable, the issue is resolved.

## Step 2: Reset the TCP/IP Stack

If releasing and renewing doesn't help, reset the TCP/IP stack:

```cmd
REM Reset Winsock (Windows Socket catalog)
netsh winsock reset

REM Reset TCP/IP stack
netsh int ip reset

REM Optional: reset Windows Firewall policies if you suspect a firewall issue
netsh advfirewall reset

REM Reboot after these commands
shutdown /r /t 0
```

## Step 3: Flush ARP Cache and DNS

```cmd
REM Flush ARP cache
arp -d *

REM Flush DNS resolver cache
ipconfig /flushdns

REM Release and renew (again after flush)
ipconfig /release
ipconfig /renew
```

## Step 4: Reset Network Adapter

```powershell
# PowerShell (run as Administrator) - Disable and re-enable the wireless adapter
# Replace "Wi-Fi" with your adapter name if different

Get-NetAdapter -Name "Wi-Fi" | Disable-NetAdapter -Confirm:$false
Start-Sleep -Seconds 3
Get-NetAdapter -Name "Wi-Fi" | Enable-NetAdapter

# Or use Device Manager approach:
# 1. Open Device Manager (devmgmt.msc)
# 2. Expand Network Adapters
# 3. Right-click wireless adapter → Disable
# 4. Right-click wireless adapter → Enable
```

## Step 5: Update or Reinstall Wireless Driver

Outdated or corrupted drivers cause this error frequently:

```powershell
# Check current driver details, including driver version and date
# Replace "Wi-Fi" with your adapter name if different
Get-NetAdapter -Name "Wi-Fi" | Format-Table -View Driver

# Via Device Manager:
# 1. devmgmt.msc → Network Adapters
# 2. Right-click wireless adapter
# 3. "Update driver" → "Search automatically"
# OR
# 4. "Uninstall device" (optionally check "Attempt to remove the driver for this device" if shown)
# 5. Reboot to reinstall automatically
```

## Step 6: Check for IP Conflicts

If another device is already using the same IPv4 address, Windows may report a conflict or fail to communicate properly:

```cmd
REM Check current IP and default gateway
ipconfig

REM Ping your default gateway from ipconfig (example: 192.168.1.1)
ping 192.168.1.1

REM Windows 11: run the Network and Internet troubleshooter in Get Help
REM Windows 10: Settings > Network & Internet > Status > Network troubleshooter
```

## Step 7: Set a Static IP as a Workaround

If DHCP consistently fails:

```powershell
# PowerShell (run as Administrator)
# List adapters to confirm the interface alias
Get-NetAdapter

# Example: replace these values with an unused IP on your subnet and your actual gateway
New-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress 192.168.1.50 -PrefixLength 24 -DefaultGateway 192.168.1.1

# Example public DNS servers; use your network's required DNS servers if different
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 8.8.8.8, 8.8.4.4

# Verify
ipconfig /all
```

## Conclusion

The "WiFi doesn't have a valid IP configuration" error is often resolved by running `ipconfig /release` and then `ipconfig /renew`, followed by `netsh winsock reset` and `netsh int ip reset` if that fails. Update or reinstall the wireless adapter driver if software resets don't help. If DHCP is fundamentally broken on the network, set a static IP as a workaround while investigating the DHCP server.
