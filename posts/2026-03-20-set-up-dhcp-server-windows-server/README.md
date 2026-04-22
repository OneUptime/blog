# How to Set Up a DHCP Server on Windows Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Windows Server, Networking, Server Configuration, Sysadmin

Description: Windows Server's DHCP role provides centralized IP address management with a graphical console and PowerShell cmdlets for scope creation, reservation management, and failover configuration.

## Installing the DHCP Role

```powershell
# Install DHCP Server role

Install-WindowsFeature -Name DHCP -IncludeManagementTools

# Authorize the DHCP server in Active Directory (required for AD environments)
Add-DhcpServerInDC -DnsName "dhcp-server.example.local" -IPAddress 192.168.1.10
```

## Creating a Scope

```powershell
# Create a scope for 192.168.1.0/24
Add-DhcpServerv4Scope `
    -Name "Main Office LAN" `
    -StartRange 192.168.1.100 `
    -EndRange 192.168.1.200 `
    -SubnetMask 255.255.255.0 `
    -State Active `
    -LeaseDuration (New-TimeSpan -Days 1)

# Set scope options (router, DNS)
Set-DhcpServerv4OptionValue `
    -ScopeId 192.168.1.0 `
    -Router 192.168.1.1 `
    -DnsServer 8.8.8.8, 1.1.1.1 `
    -DnsDomain "example.local"
```

## Adding an Exclusion Range

```powershell
# Exclude 192.168.1.100-110 from dynamic assignment (reserved for servers)
Add-DhcpServerv4ExclusionRange `
    -ScopeId 192.168.1.0 `
    -StartRange 192.168.1.100 `
    -EndRange 192.168.1.110
```

## Creating a Reservation

```powershell
# Reserve a specific IP for a device by MAC address
Add-DhcpServerv4Reservation `
    -ScopeId 192.168.1.0 `
    -IPAddress 192.168.1.110 `
    -ClientId "AA-BB-CC-DD-EE-FF" `
    -Description "Web Server"
```

## Viewing Active Leases

```powershell
# View all active leases in a scope
Get-DhcpServerv4Lease -ScopeId 192.168.1.0

# View lease for a specific IP
Get-DhcpServerv4Lease -IPAddress 192.168.1.150
```

## Exporting and Importing Configuration

```powershell
# Export entire DHCP configuration
Export-DhcpServer -File "C:\dhcp-backup.xml" -Leases

# Import on a new server
Import-DhcpServer -File "C:\dhcp-backup.xml" -BackupPath "C:\dhcp-restore" -Leases -Force
```

## Key Takeaways

- Install with `Install-WindowsFeature -Name DHCP` and authorize in AD with `Add-DhcpServerInDC`.
- Create scopes with `Add-DhcpServerv4Scope` and set options with `Set-DhcpServerv4OptionValue`.
- Use exclusion ranges to protect static IPs from the dynamic pool.
- Use `Export-DhcpServer` regularly to back up the DHCP database.
