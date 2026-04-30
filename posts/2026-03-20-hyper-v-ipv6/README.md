# How to Configure IPv6 in Hyper-V

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hyper-V, Windows Server, Virtualization, Virtual Networking

Description: Configure IPv6 for Hyper-V virtual switches, VM network adapters, and host management over IPv6, with PowerShell configuration and verification commands.

## Introduction

Hyper-V on Windows Server supports IPv6 for both host management traffic and virtual machine networking. Hyper-V Virtual Switches connect VMs to each other, the host, or external networks, and IPv6 flows through those virtual switches transparently when the connected network supports it. VMs receive IPv6 addresses through SLAAC, DHCPv6, or static configuration in the guest OS.

## Create Hyper-V Virtual Switch with IPv6

```powershell
# Create an external virtual switch (bridges to physical NIC)

# IPv6 passes through transparently
New-VMSwitch -Name "ExternalSwitch" `
    -NetAdapterName "Ethernet" `
    -AllowManagementOS $true

# Create an internal virtual switch for host-VM communication over IPv6
New-VMSwitch -Name "InternalSwitch" -SwitchType Internal

# Configure IPv6 on the host adapter for the internal switch
$adapter = Get-NetAdapter | Where-Object {$_.Name -like "*InternalSwitch*"}
New-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex `
    -IPAddress "fd00::1" `
    -PrefixLength 64
```

## Configure IPv6 on Hyper-V Host Management

```powershell
# List IPv6 addresses on the host
Get-NetIPAddress -AddressFamily IPv6 |
    Select-Object InterfaceAlias, IPAddress, PrefixLength

# Add static IPv6 to the host management vNIC attached to the external switch
New-NetIPAddress -InterfaceAlias "vEthernet (ExternalSwitch)" `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"

# Add IPv6 DNS servers
Set-DnsClientServerAddress -InterfaceAlias "vEthernet (ExternalSwitch)" `
    -ServerAddresses "2001:db8::53", "2001:4860:4860::8888"

# Verify IPv6 configuration
Get-NetIPAddress -InterfaceAlias "vEthernet (ExternalSwitch)" -AddressFamily IPv6
```

## Assign Static IPv6 to a VM

```powershell
# Inside the VM (PowerShell in guest OS)

# List current IP configuration
Get-NetIPAddress -AddressFamily IPv6

# Assign static IPv6 address
$interface = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1
New-NetIPAddress -InterfaceIndex $interface.InterfaceIndex `
    -IPAddress "2001:db8::100" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"

# Add IPv6 DNS
Set-DnsClientServerAddress -InterfaceIndex $interface.InterfaceIndex `
    -ServerAddresses "2001:db8::53"

# Verify
Test-NetConnection -ComputerName "2001:db8::1" -TraceRoute
```

## Hyper-V Live Migration over IPv6

```powershell
# Configure Live Migration to use IPv6 network
# On the Hyper-V host:

# Check whether Live Migration is enabled
Get-VMHost | Select-Object -ExpandProperty VirtualMachineMigrationEnabled

# Enable Live Migration
Enable-VMMigration

# Add a specific IPv6 subnet for Live Migration traffic
Add-VMMigrationNetwork -Subnet "2001:db8:100:200::/64"

# List configured migration networks
Get-VMMigrationNetwork

# Move a VM; Hyper-V uses the configured migration network
Move-VM -Name "MyVM" -DestinationHost "hyperv02.contoso.com" -IncludeStorage
```

## VM Network Adapter IPv6 Configuration (PowerShell)

```powershell
# Hyper-V VM network adapter settings

# Get VM network adapters
Get-VMNetworkAdapter -VMName "MyVM"

# Enable MAC address spoofing (commonly needed for nested virtualization networking)
Set-VMNetworkAdapter -VMName "MyVM" -MacAddressSpoofing On

# Check VM IPv6 addresses reported by Hyper-V (requires the Key-Value Pair Exchange integration service)
Get-VM -Name "MyVM" | Get-VMNetworkAdapter | Select-Object -ExpandProperty IPAddresses

# Should show both IPv4 and IPv6 addresses when the guest reports them through Key-Value Pair Exchange
```

## Windows Server DHCPv6 for Hyper-V VMs

```powershell
# Install DHCP server role
Install-WindowsFeature DHCP -IncludeManagementTools

# Create DHCPv6 scope for VMs
Add-DhcpServerv6Scope `
    -Name "VM IPv6 Scope" `
    -Prefix "2001:db8:100:100::" `
    -State Active

# Add DNS option to DHCPv6 scope
Set-DhcpServerv6OptionValue `
    -Prefix "2001:db8:100:100::" `
    -DnsServer "2001:db8::53"

# Verify DHCPv6 scope
Get-DhcpServerv6Scope
Get-DhcpServerv6ScopeStatistics
```

## Firewall for Hyper-V Management over IPv6

```powershell
# Windows Firewall: allow management access over IPv6

# Allow WinRM over IPv6
New-NetFirewallRule -DisplayName "Allow WinRM IPv6" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5985,5986 `
    -RemoteAddress Any6 `
    -Action Allow

# Allow Live Migration over IPv6
New-NetFirewallRule -DisplayName "Allow Live Migration IPv6" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 6600 `
    -RemoteAddress Any6 `
    -Action Allow
```

## Verify IPv6 Connectivity

```powershell
# Test IPv6 reachability to Hyper-V host
Test-NetConnection -ComputerName "2001:db8::10"

# Ping VM over IPv6
ping -6 2001:db8::100

# Check Hyper-V host networking
Get-VMNetworkAdapter -All | Select-Object Name, SwitchName, IPAddresses

# Check VM reports IPv6 via the Key-Value Pair Exchange integration service
Get-VM | Get-VMNetworkAdapter | Where-Object {$_.IPAddresses -match ":"}
```

## Conclusion

Hyper-V supports IPv6 for host management networks (configured via PowerShell `New-NetIPAddress`), VM network adapters (which pass IPv6 through virtual switches transparently), and Live Migration (configured with `Add-VMMigrationNetwork` using IPv6 subnets). Virtual machines receive IPv6 via SLAAC from the connected network or DHCPv6 from a Windows Server DHCP scope. The Key-Value Pair Exchange integration service can report VM IPv6 addresses to the host, enabling `Get-VMNetworkAdapter` to display current VM IPv6 assignments. Windows Firewall rules can be scoped to IPv6 traffic by using IPv6 address filters such as `Any6`.
