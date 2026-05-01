# How to Configure a DHCPv6 Client on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Window, Networking, PowerShell, Netsh

Description: Learn how to configure and manage a DHCPv6 client on Windows using the GUI, netsh, and PowerShell to obtain IPv6 addresses from a DHCPv6 server.

---

Windows has built-in DHCPv6 client support. When IPv6 is enabled on a network adapter, Windows can use router advertisements and DHCPv6 to obtain IPv6 addressing and other configuration such as DNS. This guide covers how to configure, verify, and troubleshoot DHCPv6 client behavior on Windows.

---

## Prerequisites

- Windows 10, 11, or Windows Server 2016+
- Administrator privileges
- IPv6-enabled network adapter
- IPv6 router advertisements and a DHCPv6 server available on the network

---

## Enabling IPv6 and DHCPv6 via GUI

### Enable IPv6 on the Network Adapter

1. Open **Control Panel** → **Network and Sharing Center** → **Change adapter settings**
2. Right-click your network adapter → **Properties**
3. Check **Internet Protocol Version 6 (TCP/IPv6)**
4. Click **Properties** → select **Obtain an IPv6 address automatically**
5. Select **Obtain DNS server address automatically**
6. Click **OK**

---

## Using netsh to Configure DHCPv6

The `netsh` command-line tool provides full control over IPv6 network configuration.

### Check Current IPv6 Configuration

```cmd
:: Show IPv6 interface configuration
netsh interface ipv6 show addresses

:: Show all interfaces
netsh interface ipv6 show interfaces

:: Show DNS servers
netsh interface ipv6 show dnsservers
```

### Enable DHCPv6 on an Interface

```cmd
:: Enable router discovery on the interface
netsh interface ipv6 set interface interface="Ethernet" routerdiscovery=enabled

:: Allow DHCPv6-managed address configuration
netsh interface ipv6 set interface interface="Ethernet" managedaddress=enabled

:: Allow other stateful DHCPv6 configuration such as DNS
netsh interface ipv6 set interface interface="Ethernet" otherstateful=enabled

:: Set DNS to automatic
netsh interface ipv6 set dnsservers name="Ethernet" source=dhcp
```

### Release and Renew DHCPv6 Lease

```cmd
:: Release IPv6 address (release DHCPv6 lease)
ipconfig /release6

:: Renew IPv6 address (request new DHCPv6 lease)
ipconfig /renew6

:: Show full IPv6 configuration and DHCPv6 client details
ipconfig /all
```

---

## Using PowerShell to Manage DHCPv6

PowerShell provides more granular control over IPv6 and DHCPv6 settings.

### View IPv6 Addresses

```powershell
# List all IPv6 addresses

Get-NetIPAddress -AddressFamily IPv6

# Show only DHCPv6-assigned addresses
Get-NetIPAddress -AddressFamily IPv6 | Where-Object { $_.PrefixOrigin -eq "Dhcp" }

# Show adapter details
Get-NetAdapter | Select-Object Name, Status, MacAddress
```

### Configure DHCPv6

```powershell
# Get current IP interface settings
Get-NetIPInterface -AddressFamily IPv6

# Enable router discovery and DHCPv6-related settings on an interface
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 -RouterDiscovery Enabled
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 -ManagedAddressConfiguration Enabled
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 -OtherStatefulConfiguration Enabled

# Remove manually assigned IPv6 addresses (if set)
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv6 -PrefixOrigin Manual | Remove-NetIPAddress -Confirm:$false

# Reset DNS to the default server addresses
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses
```

### View DHCPv6-Related Configuration

```powershell
# Show detailed IP configuration
Get-NetIPConfiguration -InterfaceAlias "Ethernet" -Detailed

# Show detailed DNS client settings
Get-DnsClient -InterfaceAlias "Ethernet"

# Show DNS suffix search list
Get-DnsClientGlobalSetting
```

---

## Verifying DHCPv6 Configuration

```cmd
:: Full network configuration details
ipconfig /all

:: Test IPv6 connectivity
ping -6 ipv6.google.com

:: Trace IPv6 route
tracert -6 ipv6.google.com

:: Show neighbor cache (IPv6 ARP equivalent)
netsh interface ipv6 show neighbors
```

---

## Capturing DHCPv6 Traffic with Wireshark

To verify DHCPv6 is working, capture traffic on UDP ports 546 (client) and 547 (server):

1. Open **Wireshark**
2. Select your network interface
3. Apply filter: `dhcpv6`
4. Look for Solicit, Advertise, Request, and Reply messages

---

## Common DHCPv6 Message Flow

| Message | Direction | Description |
|---------|-----------|-------------|
| Solicit | Client → Server | Client requests DHCPv6 configuration |
| Advertise | Server → Client | Server responds with available configuration |
| Request | Client → Server | Client formally requests the offered config |
| Reply | Server → Client | Server confirms and delivers configuration |

---

## Troubleshooting

```powershell
# Check if DHCPv6 client service is running
Get-Service -Name Dhcp

# Restart DHCP client service
Restart-Service -Name Dhcp

# Check Windows Event Log for DHCP events
Get-WinEvent -LogName System | Where-Object { $_.ProviderName -match "Dhcp" } | Select-Object -First 20

# Check IPv6 router discovery and DHCPv6-related interface flags
Get-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 | Select-Object InterfaceAlias, Dhcp, RouterDiscovery, ManagedAddressConfiguration, OtherStatefulConfiguration
```

---

## Best Practices

1. **Keep Windows updated** - DHCPv6 client improvements ship with Windows updates
2. **Use static ULA addresses** for servers; use DHCPv6 for clients needing managed addresses
3. **Verify DNS** configuration with `ipconfig /all`
4. **Test with ping -6** after any configuration change
5. **Use Event Viewer** to diagnose DHCP client service failures

---

## Conclusion

Windows provides robust DHCPv6 client support through built-in services. Whether you use the GUI, `netsh`, or PowerShell, Windows provides built-in tools for DHCPv6 client configuration and troubleshooting. Always verify your assigned IPv6 address and DNS settings after configuration.

---

*Monitor your IPv6 infrastructure with [OneUptime](https://oneuptime.com) - uptime monitoring with full IPv6 support across Windows and Linux environments.*
