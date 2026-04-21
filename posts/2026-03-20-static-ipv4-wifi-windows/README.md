# How to Configure a Static IPv4 Address for WiFi on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, Window, Static IP, IPv4, Network Configuration

Description: Learn how to configure a static IPv4 address for a WiFi adapter on Windows using both the GUI and PowerShell, and when to use static vs DHCP addressing.

## When to Use a Static WiFi IP Address

Static IP addresses are useful when:
- Running a server or service that must be reachable at a fixed IP
- DHCP is unreliable on the network
- Setting up port forwarding on a router
- Avoiding IP address conflicts in a small network
- Configuring network printers or IoT devices

## Step 1: Find Your Current Network Settings

Before setting a static IP, record your current DHCP-assigned settings:

```cmd
REM View current IP, gateway, and DNS
ipconfig /all

REM Key values to note:
REM IPv4 Address: 192.168.1.105  (choose a different static IP)
REM Subnet Mask: 255.255.255.0
REM Default Gateway: 192.168.1.1
REM DNS Servers: 192.168.1.1

REM View recently resolved IP/MAC entries (not a complete conflict check)
arp -a
```

## Step 2: Configure Static IP via GUI

1. Open **Settings** → **Network & Internet** → **WiFi**
2. Click the connected network → **Properties**
3. Under **IP settings**, click **Edit**
4. Change from **Automatic (DHCP)** to **Manual**
5. Enable **IPv4** and enter:
   - **IP address**: 192.168.1.50 (unused address in range)
   - **Subnet mask**: 255.255.255.0 (or **Subnet prefix length**: 24 if shown)
   - **Gateway**: 192.168.1.1
   - **Preferred DNS**: 8.8.8.8
   - **Alternate DNS**: 8.8.4.4
6. Click **Save**

## Step 3: Configure Static IP via PowerShell

```powershell
# Run PowerShell as Administrator

# Get wireless adapter name

Get-NetAdapter | Where-Object {$_.Name -like "*Wi-Fi*" -or $_.Name -like "*Wireless*"}
# Note the adapter name, e.g., "Wi-Fi"

# Remove existing IPv4 address and default route
Remove-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -Confirm:$false -ErrorAction SilentlyContinue

# Set static IP address
New-NetIPAddress `
  -InterfaceAlias "Wi-Fi" `
  -IPAddress "192.168.1.50" `
  -PrefixLength 24 `
  -DefaultGateway "192.168.1.1"

# Set DNS servers
Set-DnsClientServerAddress `
  -InterfaceAlias "Wi-Fi" `
  -ServerAddresses ("8.8.8.8", "8.8.4.4")

# Verify configuration
ipconfig /all | Select-String -Context 0,10 "Wi-Fi"
```

## Step 4: Configure via netsh (Legacy)

```cmd
REM Set static IP with netsh
netsh interface ip set address name="Wi-Fi" static 192.168.1.50 255.255.255.0 192.168.1.1

REM Set DNS
netsh interface ip set dns name="Wi-Fi" static 8.8.8.8
netsh interface ip add dns name="Wi-Fi" 8.8.4.4 index=2

REM Verify
netsh interface ip show config name="Wi-Fi"
```

## Step 5: Test Connectivity After Configuration

```cmd
REM Test local network
ping 192.168.1.1

REM Test internet connectivity
ping 8.8.8.8

REM Test DNS resolution
nslookup google.com

REM View full configuration
ipconfig /all
```

## Step 6: Revert to DHCP

```powershell
# Switch back to DHCP
Remove-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -Confirm:$false -ErrorAction SilentlyContinue
Set-NetIPInterface -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -Dhcp Enabled
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ResetServerAddresses

# Or with netsh
netsh interface ip set address name="Wi-Fi" dhcp
netsh interface ip set dns name="Wi-Fi" dhcp

# Renew
ipconfig /renew
```

## Conclusion

Setting a static WiFi IP on Windows is straightforward through Settings → Network → WiFi properties or via PowerShell with `New-NetIPAddress`. Always check the router's DHCP pool range before choosing a static IP to avoid conflicts - set your static IP outside the DHCP range (e.g., if DHCP assigns .100-.200, use .50 for static devices). Test connectivity with `ping` after configuration and revert to DHCP with `Set-NetIPInterface -AddressFamily IPv4 -Dhcp Enabled` if needed.
