# How to Configure DNS Servers Using Set-DnsClientServerAddress in PowerShell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, PowerShell, DNS, IPv4, Set-DnsClientServerAddress, Network Configuration

Description: Configure primary and secondary DNS servers on Windows network adapters using the Set-DnsClientServerAddress PowerShell cmdlet for automated, scriptable DNS management.

## Introduction

`Set-DnsClientServerAddress` is the PowerShell cmdlet for configuring DNS servers on Windows adapters. It replaces manual GUI configuration with a cleaner, PowerShell-native interface and offers a more modern alternative to `netsh`.

## Setting DNS Servers

```powershell
# Set primary and secondary DNS on "Ethernet" adapter

Set-DnsClientServerAddress `
    -InterfaceAlias "Ethernet" `
    -ServerAddresses @("8.8.8.8", "1.1.1.1")
```

## Setting DNS by Interface Index

```powershell
# Find the interface index first
Get-NetAdapter | Select-Object Name, InterfaceIndex

# Set DNS by index (useful when interface name is dynamic)
Set-DnsClientServerAddress -InterfaceIndex 12 -ServerAddresses @("8.8.8.8", "1.1.1.1")
```

## Setting Internal/Corporate DNS

```powershell
# Point to internal DNS servers for Active Directory
Set-DnsClientServerAddress `
    -InterfaceAlias "Ethernet" `
    -ServerAddresses @("192.168.1.10", "192.168.1.11")
```

## Resetting DNS to DHCP-Provided

```powershell
# Remove static DNS and let DHCP provide servers
Set-DnsClientServerAddress `
    -InterfaceAlias "Ethernet" `
    -ResetServerAddresses
```

## Verifying DNS Configuration

```powershell
# Show current DNS servers
Get-DnsClientServerAddress -InterfaceAlias "Ethernet"

# Or
ipconfig /all
```

## Configuring DNS on All Adapters at Once

```powershell
# Apply the same DNS to all UP adapters
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
    Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex `
        -ServerAddresses @("8.8.8.8", "1.1.1.1")
    Write-Host "DNS set on $($_.Name)"
}
```

## Testing DNS After Configuration

```powershell
# Test resolution
Resolve-DnsName "google.com"

# Test with a specific server
Resolve-DnsName "google.com" -Server "8.8.8.8"

# Clear DNS cache first for a fresh test
Clear-DnsClientCache
Resolve-DnsName "google.com"
```

## Setting DNS via netsh (CMD Alternative)

```cmd
:: Set DNS with netsh
netsh interface ipv4 set dnsservers name="Ethernet" source=static address=8.8.8.8
netsh interface ipv4 add dnsservers name="Ethernet" address=1.1.1.1 index=2
```

## DNS Configuration in a Provisioning Script

```powershell
# Example: configure multiple servers in an array for easy maintenance
$DNSServers = @(
    "192.168.1.10",   # Primary internal DNS
    "192.168.1.11"    # Secondary internal DNS
)

Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses $DNSServers
Write-Host "DNS configured: $($DNSServers -join ', ')"
```

## Conclusion

`Set-DnsClientServerAddress` is the cleanest way to configure DNS in PowerShell scripts. It accepts arrays of server addresses, works with both alias and index, and supports resetting to DHCP-provided servers. Always test with `Resolve-DnsName` after configuring.
