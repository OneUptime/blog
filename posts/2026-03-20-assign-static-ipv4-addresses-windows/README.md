# How to Assign Static IPv4 Addresses on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, IPv4, Networking, Network Configuration, Static IP, Sysadmin

Description: On Windows, static IPv4 addresses can be set through the GUI Network Adapter settings, via the netsh command-line tool, or using PowerShell's New-NetIPAddress cmdlet.

## Method 1: PowerShell (Recommended)

PowerShell provides the most scriptable and modern approach:

```powershell
# Find the interface index (ifIndex column)

Get-NetAdapter

# Assign a static IP address
New-NetIPAddress `
    -InterfaceIndex 5 `
    -IPAddress "192.168.1.100" `
    -PrefixLength 24 `
    -DefaultGateway "192.168.1.1"

# Set DNS servers
Set-DnsClientServerAddress `
    -InterfaceIndex 5 `
    -ServerAddresses ("8.8.8.8", "1.1.1.1")

# Verify
Get-NetIPAddress -InterfaceIndex 5 -AddressFamily IPv4
Get-NetRoute -InterfaceIndex 5 -AddressFamily IPv4
```

## Method 2: netsh (Command Prompt)

```cmd
REM Assign static IP (replace "Ethernet" with your adapter name)
netsh interface ipv4 set address name="Ethernet" source=static address=192.168.1.100 mask=255.255.255.0 gateway=192.168.1.1

REM Set DNS servers
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=8.8.8.8
netsh interface ipv4 add dnsservers name="Ethernet" address=1.1.1.1 index=2

REM Verify
netsh interface ipv4 show config name="Ethernet"
```

## Method 3: GUI (Network Adapter Settings)

1. Open **Control Panel → Network and Sharing Center → Change adapter settings**.
2. Right-click the adapter → **Properties**.
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**.
4. Choose **Use the following IP address** and enter:
   - IP address: `192.168.1.100`
   - Subnet mask: `255.255.255.0`
   - Default gateway: `192.168.1.1`
5. Set preferred DNS server: `8.8.8.8`, alternate: `1.1.1.1`.
6. Click **OK** and close.

## Reverting to DHCP

```powershell
# PowerShell: switch back to DHCP for IPv4
Set-NetIPInterface -InterfaceIndex 5 -AddressFamily IPv4 -Dhcp Enabled
Remove-NetIPAddress -InterfaceIndex 5 -AddressFamily IPv4 -PrefixOrigin Manual -Confirm:$false -ErrorAction SilentlyContinue
Set-DnsClientServerAddress -InterfaceIndex 5 -ResetServerAddresses

# netsh equivalent
# netsh interface ipv4 set address name="Ethernet" source=dhcp
# netsh interface ipv4 set dnsservers name="Ethernet" source=dhcp
```

## Verifying the Configuration

```powershell
# Show all IP configuration details
ipconfig /all

# Test gateway and internet reachability
Test-NetConnection -ComputerName 192.168.1.1
Test-NetConnection -ComputerName 8.8.8.8
```

## Key Takeaways

- PowerShell (`New-NetIPAddress`) is the most scriptable and recommended method.
- `netsh` remains available on current Windows versions, but Microsoft recommends PowerShell for new automation.
- If you are replacing an existing manual IPv4 configuration, remove or update only the specific IPv4 address or default route you no longer want.
- Use `ipconfig /all` to verify the full IP, mask, gateway, and DNS configuration.
