# How to Enable IPv6 on Windows Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Windows Server, Network Configuration, PowerShell, Netsh

Description: Learn how to enable and verify IPv6 on Windows Server through the GUI, PowerShell, and netsh, including configuring IPv6 for production server roles.

## IPv6 Status on Windows Server

IPv6 is enabled by default on Windows Server. However, it may be disabled via registry settings or Group Policy. Here's how to check and enable it:

```powershell
# Check if IPv6 is enabled on network adapters

Get-NetAdapterBinding -ComponentID ms_tcpip6

# Output shows Enabled=True/False for each adapter:
# Name       DisplayName         ComponentID  Enabled
# ----       -----------         -----------  -------
# Ethernet   Internet Protocol   ms_tcpip6    True
```

## Enable IPv6 via PowerShell

```powershell
# Enable IPv6 on a specific adapter
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Enable on all visible adapters
Enable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6

# Verify
Get-NetAdapterBinding -ComponentID ms_tcpip6 | Select-Object Name, Enabled
```

## Enable IPv6 via GUI

1. Open **Network and Sharing Center**
2. Click **Change adapter settings**
3. Right-click the network adapter → **Properties**
4. Check **Internet Protocol Version 6 (TCP/IPv6)**
5. Click **OK**

## Inspect IPv6 via netsh

Use `netsh` to inspect IPv6 state and configuration after enabling the binding through PowerShell or the GUI.

```cmd
:: Check interface list
netsh interface ipv6 show interfaces

:: Show IPv6 configuration
netsh interface ipv6 show addresses
```

## Check IPv6 Registry Settings

Windows stores IPv6 behavior flags in the registry. If `DisabledComponents` is set to disable IPv6 components, IPv6 won't work even if the adapter binding is enabled:

```powershell
# Check the DisabledComponents registry value
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents -ErrorAction SilentlyContinue

# If DisabledComponents exists and is non-zero, IPv6 behavior has been changed
# 0x00 = Default Windows behavior
# 0x20 = Prefer IPv4 over IPv6 (does not disable IPv6)
# 0xFF = Disable IPv6 on nontunnel and tunnel interfaces; loopback still remains

# Re-enable all IPv6 components
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents -Value 0 -Type DWord

# Restart required for registry change to take effect
Restart-Computer
```

## Verify IPv6 is Working

```powershell
# Show all IPv6 addresses on all interfaces
Get-NetIPAddress -AddressFamily IPv6

# Check for link-local address (fe80::) - indicates IPv6 is active
Get-NetIPAddress -AddressFamily IPv6 | Where-Object {$_.IPAddress -like "fe80*"}

# Test IPv6 connectivity
Test-NetConnection -ComputerName "2001:4860:4860::8888" -Port 80

# Ping IPv6 address
ping -6 2001:4860:4860::8888

# Check IPv6 default route
Get-NetRoute -AddressFamily IPv6 | Where-Object {$_.DestinationPrefix -eq "::/0"}
```

## Configure IPv6 for Server Roles

```powershell
# For a server with static IPv6:
New-NetIPAddress -InterfaceAlias "Ethernet" `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"

# Set IPv6 DNS servers
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
    -ServerAddresses "2001:4860:4860::8888", "2001:4860:4860::8844"

# Verify final configuration
Get-NetIPConfiguration -InterfaceAlias "Ethernet"
```

## Summary

IPv6 is enabled by default on Windows Server. Enable it per-adapter with `Enable-NetAdapterBinding -Name "<AdapterName>" -ComponentID ms_tcpip6` or through Network Adapter Properties. Use `netsh` to inspect IPv6 state, and check the `DisabledComponents` registry key if IPv6 doesn't work even after enabling the binding. Verify with `Get-NetIPAddress -AddressFamily IPv6` and `ping -6`. Configure static IPv6 with `New-NetIPAddress` and DNS with `Set-DnsClientServerAddress`.
