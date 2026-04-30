# How to Fix IPv4 Connectivity Showing 'No Internet Access' on WiFi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, Window, No Internet, IPv4, Troubleshooting, DHCP

Description: Learn how to fix the 'No Internet Access' warning on Windows WiFi when you have an IP address but cannot reach the internet, covering DNS, gateway, and routing issues.

## Understanding the "No Internet Access" Warning

Windows shows "No Internet Access" when the Network Connectivity Status Indicator (NCSI) cannot complete its connectivity probe. On Windows 10, NCSI runs through the Network Location Awareness (NLA) service; on Windows 11, it is hosted in the Network List Service. This can happen even when you have a valid IP address.

Causes:
- DNS resolution failures
- Gateway not routing traffic to internet
- Firewall blocking outbound traffic
- Incorrect default gateway
- ISP-level issues
- Corporate proxy required

## Step 1: Verify Your IP Configuration

```cmd
REM Check IP, gateway, and DNS
ipconfig /all

REM Key things to verify:
REM - IPv4 Address: should NOT be 169.254.x.x (APIPA)
REM - Default Gateway: should be your router's IP (e.g., 192.168.1.1)
REM - DNS Servers: should be valid (e.g., 8.8.8.8 or your router)
```

## Step 2: Test Connectivity in Order

```cmd
REM Step 1: Can you reach the gateway?
ping 192.168.1.1
REM If this fails: the problem is local (WiFi, cable, router)

REM Step 2: Can you reach the internet by IP?
ping 8.8.8.8
REM If this fails but gateway ping worked: routing issue or ISP problem

REM Step 3: Can you resolve DNS?
nslookup google.com
REM If this fails but IP ping worked: DNS is the problem

REM Step 4: Can you reach an HTTP resource?
curl http://www.msftconnecttest.com/connecttest.txt 2>nul
REM Should return "Microsoft Connect Test"
```

## Step 3: Fix DNS Issues

If DNS resolution fails:

```powershell
# Change DNS to Google's public DNS

Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 8.8.8.8, 8.8.4.4

# Or use Cloudflare
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 1.1.1.1, 1.0.0.1

# Flush DNS cache
ipconfig /flushdns

# Test DNS
nslookup google.com 8.8.8.8
```

## Step 4: Fix Default Gateway Issues

```cmd
REM Check routing table
route print

REM Look for the default route (0.0.0.0):
REM   Network Destination  Netmask  Gateway  Interface  Metric
REM   0.0.0.0             0.0.0.0  192.168.1.1  ...  25

REM If no default route, add one:
route add 0.0.0.0 mask 0.0.0.0 192.168.1.1

REM Or permanently:
route /p add 0.0.0.0 mask 0.0.0.0 192.168.1.1
```

## Step 5: Check NCSI Status

The "No Internet" warning comes from NCSI. Check what Windows thinks the connectivity state is:

```powershell
Get-NetConnectionProfile

# Look at IPv4Connectivity and IPv6Connectivity.
# If either shows Internet, Windows considers that interface online.
```

## Step 6: Prefer IPv4 Over IPv6 (If IPv6 Connectivity Is Broken)

Microsoft recommends not disabling IPv6 or unbinding it from adapters. If broken IPv6 is suspected, prefer IPv4 instead:

```powershell
# Prefer IPv4 over IPv6
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
  -Name "DisabledComponents" -PropertyType DWord -Value 0x20 -Force

# Restart Windows for the change to take effect
shutdown /r /t 0
```

## Step 7: Reset Network Stack

If all else fails:

```cmd
REM Full network stack reset
netsh winsock reset
netsh interface ipv4 reset
netsh interface ipv6 reset
ipconfig /flushdns
ipconfig /release
ipconfig /renew
shutdown /r /t 0
```

## Conclusion

"No Internet Access" on Windows WiFi with a valid IP usually means a DNS failure, missing default route, or an NCSI/proxy issue. Test systematically: ping the gateway, then `8.8.8.8`, then run `nslookup`. Fix DNS by pointing to `8.8.8.8`. Fix routing by verifying the default route with `route print`. If the warning looks wrong, compare it with `Get-NetConnectionProfile`. Full `netsh` resets resolve persistent stack corruption.
