# How to Fix 'Default Gateway Is Not Available' on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Default Gateway, Window, Troubleshooting, Network, TCP/IP

Description: Learn how to fix the 'Default Gateway is not available' error on Windows, which prevents internet access even when the network adapter shows as connected.

## What Causes This Error?

The "Default Gateway is not available" error appears when:
- The network adapter driver is corrupted or outdated
- TCP/IP stack is misconfigured
- The DHCP server is unreachable or not assigning a gateway
- A static IP is configured without a gateway
- Network adapter power management is interfering

## Step 1: Check Current Gateway Configuration

```cmd
REM View IP configuration including gateway
ipconfig /all

REM If Default Gateway shows as blank or 0.0.0.0, that's the problem
REM Healthy output looks like:
REM Default Gateway . . . . . . . . : 192.168.1.1

REM Test if the gateway itself is reachable
ping 192.168.1.1
```

## Step 2: Run the Windows Network Troubleshooter

```cmd
REM Open troubleshooting settings
start ms-settings:troubleshoot

REM Windows 11:
REM Settings → System → Troubleshoot → Other troubleshooters
REM Open Get Help and run the Network and Internet troubleshooter

REM Windows 10:
REM Settings → Network & Internet → Status → Network troubleshooter
```

Windows will often automatically fix this by resetting the adapter or renewing DHCP settings.

## Step 3: Reset TCP/IP Stack

```cmd
REM Run as Administrator - resets Winsock and the TCP/IP stack
netsh winsock reset
netsh int ip reset
netsh int ipv6 reset

REM If the adapter uses DHCP, renew the lease
ipconfig /release
ipconfig /renew

REM Clear the DNS client resolver cache
ipconfig /flushdns

REM Reboot after these commands
shutdown /r /t 0
```

## Step 4: Disable Network Adapter Power Management

Windows can power off network adapters to save energy, which drops the gateway:

```powershell
# Find adapter name

Get-NetAdapter | Select-Object Name, Status

# Disable power management via PowerShell
Disable-NetAdapterPowerManagement -Name "Ethernet"

# Or via Device Manager:
# devmgmt.msc → Network Adapters → [Adapter] → Properties
# → Power Management → Uncheck "Allow the computer to turn off this device to save power"
```

## Step 5: Set Static Gateway Manually

```powershell
# If DHCP consistently fails to provide a gateway, set it manually
# First remove any existing IP configuration
Remove-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4 -Confirm:$false
Remove-NetRoute -InterfaceAlias "Ethernet" -DestinationPrefix "0.0.0.0/0" -Confirm:$false

# Set static IP with gateway
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress 192.168.1.50 `
    -AddressFamily IPv4 `
    -PrefixLength 24 `
    -DefaultGateway 192.168.1.1

# Set DNS
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 8.8.8.8, 8.8.4.4

# Verify
ipconfig /all
ping 192.168.1.1
```

## Step 6: Update or Reinstall Network Driver

```cmd
REM Open Device Manager
devmgmt.msc

REM Navigate to: Network Adapters → [Your Adapter]
REM Right-click → Update driver
REM Or: Uninstall device → Reboot (Windows reinstalls automatically)
```

```powershell
# Show driver version and date via PowerShell
Get-NetAdapter -Name "*" | Format-Table -View Driver

# Roll back driver if issue started after update:
# Device Manager → [Adapter] → Properties → Driver → Roll Back Driver
```

## Step 7: Verify DHCP Client Service

```cmd
REM Check DHCP Client service status
sc query dhcp

REM Restart if stopped or failing
net stop dhcp
net start dhcp

REM Or via Services console
services.msc
REM Find "DHCP Client" → Restart
```

## Conclusion

"Default gateway is not available" is often resolved by resetting Winsock and the TCP/IP stack, rebooting, disabling adapter power management, setting a static gateway if DHCP is unreliable, and updating the NIC driver. Always verify the local network path with `ping [gateway-ip]` - if that succeeds, your PC can reach the router and you can continue testing DNS and internet access.
