# How to Fix IPv4 and IPv6 Both Showing 'Not Connected' on WiFi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, IPv4, IPv6, Not Connected, Window, Troubleshooting

Description: Learn how to fix the issue where both IPv4 and IPv6 show 'Not Connected' on Windows WiFi, indicating a complete connectivity failure at the IP layer.

## What Does "IPv4 and IPv6 Not Connected" Mean?

When Windows shows both IPv4 and IPv6 as "Not Connected" in the Network and Sharing Center, Windows has not established usable IP connectivity on that adapter. The cause can be a WiFi link problem, disabled protocol bindings, or failure to obtain usable IP configuration. This is more severe than just "No Internet" because the adapter is not communicating over either IP protocol.

## Step 1: Verify the WiFi Association

```cmd
REM Check if WiFi is connected at Layer 2
netsh wlan show interfaces

REM Output:
REM Name                   : Wi-Fi
REM State                  : connected     <- or disconnected
REM SSID                   : MyNetwork
REM BSSID                  : aa:bb:cc:dd:ee:ff
REM Authentication         : WPA2-Personal

REM If State is "connected" but IP configuration is still missing or unusable,
REM the problem is at Layer 3
REM If State is "disconnected", fix the WiFi connection first
```

## Step 2: Attempt Manual DHCP Renewal

```cmd
REM Run as Administrator
ipconfig /release
ipconfig /renew

REM If renew fails with "Unable to contact DHCP server":
REM The client is not reaching a DHCP server

REM Try release/renew for specific adapter
ipconfig /release "Wi-Fi"
ipconfig /renew "Wi-Fi"
```

## Step 3: Reset Network Components

```cmd
REM Full network stack reset (run as Administrator)
netsh winsock reset
netsh interface ipv4 reset
netsh interface ipv6 reset
netsh advfirewall reset
ipconfig /flushdns

REM Restart adapter
netsh interface set interface name="Wi-Fi" admin=DISABLED
netsh interface set interface name="Wi-Fi" admin=ENABLED

REM Reboot
shutdown /r /t 0
```

## Step 4: Re-enable IPv4 and IPv6 Protocol Bindings

Sometimes the protocol bindings get disabled:

```powershell
# PowerShell - Check bindings

Get-NetAdapterBinding -Name "Wi-Fi"

# Re-enable IPv4
Enable-NetAdapterBinding -Name "Wi-Fi" -ComponentID ms_tcpip

# Re-enable IPv6
Enable-NetAdapterBinding -Name "Wi-Fi" -ComponentID ms_tcpip6

# Via GUI:
# Control Panel → Network and Sharing Center
# Change adapter settings → Right-click Wi-Fi → Properties
# Ensure "Internet Protocol Version 4" and "Version 6" are checked
```

## Step 5: Check Windows Services

Required services must be running:

```cmd
REM Check DHCP Client service
sc query Dhcp
REM Should show: STATE : 4 RUNNING

REM Start if stopped
net start Dhcp

REM Check other required services
REM NlaSvc = Network Location Awareness
sc query NlaSvc
REM WlanSvc = WLAN AutoConfig
sc query WlanSvc
REM Netprofm = Network List Service
sc query Netprofm

REM Start any stopped services
net start NlaSvc
net start WlanSvc
net start Netprofm
```

## Step 6: Restart or Reinstall WiFi Adapter

```powershell
# Get the WiFi adapter
Get-NetAdapter -Name "Wi-Fi"

# Uninstall via Device Manager:
# devmgmt.msc → Network Adapters
# Right-click wireless adapter → Uninstall device
# Check "Delete the driver software for this device"
# Action → Scan for hardware changes (reinstalls)

# Or restart the adapter via PowerShell
Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Enable-NetAdapter -Name "Wi-Fi" -Confirm:$false
```

## Step 7: Check DHCP Server Availability

The issue may be the DHCP server, not the client:

```cmd
REM From another working device, check if DHCP server has capacity
REM Log into router and verify DHCP pool is not exhausted

REM Test if the adapter works with a static IPv4 assignment:
netsh interface ipv4 set address name="Wi-Fi" source=static address=192.168.1.100 mask=255.255.255.0 gateway=192.168.1.1
netsh interface ipv4 set dnsservers name="Wi-Fi" source=static address=8.8.8.8
ipconfig /all
REM Return the adapter to DHCP after testing
netsh interface ipv4 set address name="Wi-Fi" source=dhcp
netsh interface ipv4 set dnsservers name="Wi-Fi" source=dhcp
REM If static IPv4 works, the WiFi link is up and the DHCP path is the next thing to check
```

## Conclusion

Both IPv4 and IPv6 showing "Not Connected" means Windows has not established usable IP connectivity on that adapter. Work through the steps: run `ipconfig /release && ipconfig /renew`, then reset the stack with `netsh winsock reset`, `netsh interface ipv4 reset`, and `netsh interface ipv6 reset`, re-enable protocol bindings, verify the DHCP Client service is running, and reinstall the wireless adapter driver as a last resort. Test with a static IPv4 address to help determine whether the problem is in the DHCP path or on the DHCP server.
