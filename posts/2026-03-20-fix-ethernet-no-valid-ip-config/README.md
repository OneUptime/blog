# How to Fix 'Ethernet Doesn't Have a Valid IP Configuration'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ethernet, Window, IP Configuration, Troubleshooting, DHCP

Description: Learn how to fix the 'Ethernet doesn't have a valid IP configuration' error in Windows, which causes complete loss of network connectivity despite the cable being connected.

## What This Error Means

This error appears in the Windows Network Diagnostics results when:
- The Ethernet adapter couldn't get an IP address from DHCP
- The TCP/IP stack is corrupted
- The NIC driver is outdated or buggy
- A static IP is configured incorrectly
- The DHCP server is unreachable, or the switch port/VLAN path isn't allowing DHCP offers through

## Step 1: Release and Renew IP Address

```cmd
REM Run as Administrator
ipconfig /release
ipconfig /renew
ipconfig /all

REM If you see a valid IP (192.168.x.x / 10.x.x.x), the issue is resolved
REM If you still see 169.254.x.x (APIPA) or 0.0.0.0, continue troubleshooting
```

## Step 2: Reset Network Stack

```cmd
REM Reset Winsock and the TCP/IP stack
netsh winsock reset
netsh int ip reset reset.log
netsh interface ipv6 reset
ipconfig /flushdns
ipconfig /registerdns

REM Reboot is required after these commands
shutdown /r /t 0
```

## Step 3: Re-enable the Adapter

```powershell
# Restart the adapter cleanly
# Replace "Ethernet" with your adapter name if it's different

Disable-NetAdapter -Name "Ethernet" -Confirm:$false
Start-Sleep -Seconds 5
Enable-NetAdapter -Name "Ethernet"
Start-Sleep -Seconds 10

# Check status
Get-NetAdapter -Name "Ethernet" | Select-Object Status, LinkSpeed
ipconfig /all
```

## Step 4: Set a Static IP as a Workaround

```powershell
# Use this to test and temporarily restore connectivity
# Replace "Ethernet" with your adapter name if it's different
# First check your router's subnet and pick an unused IP (usually 192.168.1.x or 192.168.0.x)

# Remove any bad IP config
Remove-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 -Confirm:$false 2>$null
Remove-NetRoute -InterfaceAlias "Ethernet" -DestinationPrefix "0.0.0.0/0" -Confirm:$false 2>$null

# Set static IP
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.1.100 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.1.1

Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 8.8.8.8

# Test
ping 192.168.1.1
ping 8.8.8.8
```

## Step 5: Check IPv4 Protocol Binding

```powershell
# Verify IPv4 is bound to the adapter
# Replace "Ethernet" with your adapter name if it's different
Get-NetAdapterBinding -Name "Ethernet" | Where-Object {$_.ComponentID -like "ms_tcpip*"}

# Re-enable if shown as disabled
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6
```

## Step 6: Update or Reinstall NIC Driver

```powershell
# Check current driver info
# Replace "Ethernet" with your adapter name if it's different
Get-NetAdapter -Name "Ethernet" | Format-Table -View Driver

# Open Device Manager to update
Start-Process devmgmt.msc

# Steps in Device Manager:
# Network Adapters → [NIC name]
# Right-click → Update driver
# If update doesn't help: Right-click → Uninstall device → Uninstall
# Restart Windows or Action → Scan for hardware changes (Windows attempts to reinstall the driver)
```

## Step 7: Check for Router/Switch Issues

```cmd
REM Check if DHCP server is responding (Wireshark or tcpdump method)
REM From another device on same network, check DHCP pool status

REM On Cisco switch - verify the port is up and in the expected VLAN
REM show interfaces GigabitEthernet0/1 status
REM show mac address-table interface GigabitEthernet0/1

REM Check if VLAN assignment is correct on the switch port
REM show run interface GigabitEthernet0/1
```

## Conclusion

"Ethernet doesn't have a valid IP configuration" is often fixed by running `netsh winsock reset` and `netsh int ip reset` followed by a reboot. If that doesn't work, set a temporary static IP to confirm the NIC and cable are functional, then investigate the DHCP server. Check IPv4 protocol bindings and update the NIC driver if other steps fail.
