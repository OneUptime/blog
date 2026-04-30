# How to Fix 'No Internet, Secured' WiFi Error on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, Window, No Internet, Secured, Troubleshooting

Description: Learn how to fix the 'No Internet, Secured' WiFi status in Windows, which means you're connected to WiFi but cannot access the internet.

## What "No Internet, Secured" Means

"Secured" means Wi-Fi authentication succeeded.
"No Internet" usually means one of:
- DHCP failed (got 169.254.x.x APIPA address)
- Got a valid IP but DNS is broken
- Got a valid IP and DNS works but internet routing is blocked
- Windows network connectivity detection failed even though the connection may still work

## Step 1: Diagnose the Connection Layer

```cmd
REM Check what IP you actually have
ipconfig /all

REM 169.254.x.x = DHCP failed (APIPA)
REM Private LAN IPv4 (for example 192.168.x.x, 10.x.x.x, or 172.16-31.x.x) = you have an IPv4 address

REM Test each layer
ping 127.0.0.1          REM TCP/IP stack
REM Replace 192.168.1.1 with the Default Gateway shown by ipconfig
ping 192.168.1.1        REM Local gateway
ping 8.8.8.8            REM Internet (no DNS)
nslookup google.com     REM DNS test
```

## Step 2: Fix DHCP Failure (169.254.x.x)

```cmd
REM Release and renew DHCP
ipconfig /release
ipconfig /renew

REM If no IP obtained, reset network stack
REM Run Command Prompt as Administrator for the reset commands below
netsh winsock reset
netsh int ip reset resetlog.txt
shutdown /r /t 0
```

## Step 3: Fix DNS Issues

```powershell
# Run PowerShell as Administrator
# Replace "Wi-Fi" if your adapter has a different name; use Get-NetAdapter -Name * to list adapters

Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 8.8.8.8, 8.8.4.4
ipconfig /flushdns

# Test DNS
nslookup google.com 8.8.8.8
```

## Step 4: Disable and Re-enable Adapter

```powershell
# Run PowerShell as Administrator
# Replace "Wi-Fi" if your adapter has a different name

# Restart WiFi adapter
Disable-NetAdapter -Name "Wi-Fi" -Confirm:$false
Start-Sleep 3
Enable-NetAdapter -Name "Wi-Fi"
```

## Step 5: Forget and Reconnect

1. Settings → Network & internet → Wi-Fi → Manage known networks
2. Click the network → **Forget**
3. Reconnect and enter password

## Step 6: Reset NLA Service (Windows 10)

```cmd
REM If websites load but Windows still says "No Internet", restart NLA
net stop nlasvc
net start nlasvc
```

On Windows 11, connectivity detection is handled by the Network List Service instead.

## Conclusion

"No Internet, Secured" is diagnosed by checking whether you have an IP (`ipconfig`), whether the default gateway is reachable (`ping 192.168.1.1` after replacing it with your actual gateway), and whether DNS works (`nslookup`). Fix DHCP failures with `ipconfig /release` followed by `ipconfig /renew`, DNS issues by setting `8.8.8.8`, and persistent issues with `netsh winsock reset`, `netsh int ip reset resetlog.txt`, and a reboot.
