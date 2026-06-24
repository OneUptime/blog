# How to Flush and Renew IPv4 Address with ipconfig /release and /renew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ipconfig, DHCP, Window, IP Address, Release Renew

Description: Learn how to use ipconfig /release and /renew to flush the current IPv4 address and request a new one from the DHCP server, fixing IP assignment and connectivity issues on Windows.

## When to Use ipconfig /release and /renew

Use this process when:
- You have an IP conflict with another device
- You're getting a 169.254.x.x APIPA address
- IP address isn't renewing after moving networks
- You want to pick up a new DHCP lease after router changes
- Network troubleshooter recommends renewing the lease

## Step 1: Basic Release and Renew

```cmd
REM Run as Standard User or Administrator

REM Release current IP address (sends DHCP Release to server)
ipconfig /release

REM Expected output:
REM Windows IP Configuration
REM Ethernet adapter Ethernet:
REM    Connection-specific DNS Suffix  . :
REM    Link-local IPv6 Address . . . . . : fe80::...
REM    Default Gateway . . . . . . . . . :
REM (IP is now blank - adapter has no IPv4 address)

REM Request DHCP configuration from the server
ipconfig /renew

REM Expected output shows renewed IP configuration:
REM IPv4 Address. . . . . . . . . . . : 192.168.1.105
REM Subnet Mask . . . . . . . . . . . : 255.255.255.0
REM Default Gateway . . . . . . . . . : 192.168.1.1
```

## Step 2: Release/Renew a Specific Adapter

```cmd
REM Show all adapter names
ipconfig /all | findstr "adapter"

REM Release/renew only one adapter (useful with multiple NICs)
ipconfig /release "Ethernet"
ipconfig /renew "Ethernet"

ipconfig /release "Wi-Fi"
ipconfig /renew "Wi-Fi"

REM Wildcards are supported
ipconfig /release "Wi*"
ipconfig /renew "Wi*"
```

## Step 3: Flush DNS Alongside Renew (Optional)

```cmd
REM Optional sequence when you're also troubleshooting DNS
ipconfig /release
ipconfig /flushdns
ipconfig /renew
ipconfig /registerdns

REM Verify result
ipconfig /all

REM View DNS client cache after flushing
ipconfig /displaydns
```

## Step 4: Troubleshoot If /renew Fails

```cmd
REM If ipconfig /renew hangs or returns "No operation can be performed":

REM 1. Check if DHCP Client service is running
sc query dhcp
net start dhcp

REM 2. Verify the adapter is enabled
netsh interface show interface

REM 3. Try disabling and re-enabling the adapter
netsh interface set interface "Ethernet" admin=disabled
netsh interface set interface "Ethernet" admin=enabled

REM 4. Then retry
ipconfig /release
ipconfig /renew
```

## Step 5: Equivalent on Linux and macOS

```bash
# Linux - release and renew via dhclient

sudo dhclient -r eth0    # Release
sudo dhclient eth0       # Renew

# NetworkManager
nmcli con down "Wired connection 1"
nmcli con up "Wired connection 1"

# systemd-networkd
sudo networkctl renew eth0

# macOS
sudo ipconfig set en0 DHCP
# Or via networksetup
sudo networksetup -setdhcp "Wi-Fi"
```

## Step 6: What Happens Under the Hood

```text
DHCP Release and Renew sequence:

ipconfig /release:
  Client → DHCP Release → Server
  Server can return the address to its available pool

ipconfig /renew:
  If no usable lease is present, the exchange typically is:
    Client → DHCP Discover
    Server → DHCP Offer (IP: 192.168.1.105)
    Client → DHCP Request (accept offer)
    Server → DHCP Acknowledge (lease confirmed)
  If the client is renewing an existing lease, DHCP can begin with DHCP Request instead.
```

```cmd
REM Monitor DHCP traffic during renew (requires Wireshark or tcpdump)
REM Filter: bootp or udp port 67 or udp port 68

REM View DHCP lease information
ipconfig /all | findstr "Lease"
REM Shows: Lease Obtained and Lease Expires timestamps
```

## Step 7: Automate IP Renewal via Script

```batch
@echo off
REM save as renew-ip.bat, run as Administrator

echo Releasing IP address...
ipconfig /release "Ethernet"
ping 127.0.0.1 -n 3 > nul

echo Flushing DNS cache...
ipconfig /flushdns

echo Renewing IP address...
ipconfig /renew "Ethernet"

echo.
echo Current IP configuration:
ipconfig | findstr /c:"IPv4" /c:"Gateway"
pause
```

## Conclusion

`ipconfig /release` sends a DHCP Release message to release the current lease, and `ipconfig /renew` requests DHCP configuration again, which may renew the same IPv4 address or assign a different one. If the client has no usable lease, this typically follows the standard Discover/Offer/Request/Acknowledge exchange. Use `ipconfig /flushdns` when you're also troubleshooting stale DNS cache entries, and `ipconfig /registerdns` when you need to refresh dynamic DNS registration. If `/renew` hangs, check that the DHCP Client service is running with `sc query dhcp` and the adapter is enabled. For multiple adapters, specify the adapter name explicitly to avoid releasing all connections simultaneously.
