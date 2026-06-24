# How to Configure IPv6 Privacy Extensions on Windows - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, Window, PowerShell, Netsh, Security

Description: A guide to enabling and configuring IPv6 privacy extensions on Windows 10 and Windows 11 using netsh, PowerShell, and Group Policy, to ensure temporary IPv6 addresses are used for outbound...

Windows enables IPv6 privacy extensions by default, but the configuration can be customized or may have been changed by administrators. This guide explains how to verify, enable, and manage IPv6 privacy extensions on Windows systems.

## Checking Current Privacy Extension State

```powershell
# Check IPv6 privacy address settings via PowerShell

Get-NetIPv6Protocol | Select-Object UseTemporaryAddresses, MaxDadAttempts, MaxValidLifetime, MaxPreferredLifetime, RegenerateTime, MaxRandomTime

# Inspect current SLAAC-derived IPv6 addresses per interface
Get-NetIPAddress -AddressFamily IPv6 |
  Where-Object { $_.PrefixOrigin -eq "RouterAdvertisement" } |
  Select-Object InterfaceAlias, IPAddress, SuffixOrigin, AddressState, ValidLifetime, PreferredLifetime

# Check via netsh
netsh interface ipv6 show privacy
```

## Enabling Privacy Extensions via PowerShell

```powershell
# Enable privacy extensions globally (affects all interfaces)
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled

# Configure how long a temporary address remains preferred for new outbound connections
# Default: 1 day. Lower = more frequent source-address rollover for new connections
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled `
  -MaxTemporaryPreferredLifetime (New-TimeSpan -Hours 12)

# Check current addresses (temporary ones show SuffixOrigin "Random")
Get-NetIPAddress -AddressFamily IPv6 | Where-Object { $_.PrefixOrigin -eq "RouterAdvertisement" } |
  Select-Object InterfaceAlias, IPAddress, SuffixOrigin, AddressState, ValidLifetime, PreferredLifetime
```

## Using netsh for Legacy Management

```cmd
REM Check privacy state
netsh interface ipv6 show privacy

REM Enable privacy extensions
netsh interface ipv6 set privacy state=enabled

REM Adjust how long a temporary address remains preferred for new connections
netsh interface ipv6 set privacy maxpreferredlifetime=12h

REM View assigned IPv6 addresses with full details
netsh interface ipv6 show addresses level=verbose

REM Inspect the IPv6 routes that influence outbound path selection
netsh interface ipv6 show route
```

## Verifying Temporary Addresses Are Used

```powershell
# Check all IPv6 addresses on the system
Get-NetIPAddress -AddressFamily IPv6 |
  Where-Object { $_.SuffixOrigin -eq "Random" } |
  Select-Object InterfaceAlias, IPAddress, ValidLifetime, PreferredLifetime

# The "Random" SuffixOrigin indicates privacy extension addresses

# Test which address is used for outbound connections
# (Check via a website that shows your IPv6)
(Invoke-RestMethod -Uri "https://ipv6.icanhazip.com").Trim()
# If a temporary address was selected for that connection, it will match one of the Random addresses listed above
```

## Windows Address Types

```powershell
# Windows IPv6 address SuffixOrigin values:
# Manual = static
# WellKnown = loopback or other well-known suffix
# Dhcp = DHCPv6 assigned
# Link = suffix derived from the link-layer address
# Random = privacy extension temporary address

# Count addresses by type
Get-NetIPAddress -AddressFamily IPv6 -InterfaceAlias "Wi-Fi" |
  Group-Object SuffixOrigin | Select-Object Name, Count
```

## Group Policy for Enterprise Management

```powershell
# There is no dedicated Administrative Template policy for IPv6 privacy extensions.
# The "IPv6 Transition Technologies" policy area covers 6to4, ISATAP, and Teredo.
# In managed environments, deploy a startup script or configuration-management task
# that runs the supported PowerShell or netsh commands.

# PowerShell startup-script example
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled `
  -MaxTemporaryPreferredLifetime (New-TimeSpan -Days 1)

# netsh alternative
netsh interface ipv6 set privacy state=enabled store=persistent
netsh interface ipv6 set privacy maxpreferredlifetime=1d store=persistent
```

## Disabling Privacy Extensions for Servers

Server systems that need stable IPv6 addresses should disable privacy extensions:

```powershell
# Disable privacy extensions on a Windows Server
Set-NetIPv6Protocol -UseTemporaryAddresses Disabled

# Assign a static IPv6 address instead
New-NetIPAddress -InterfaceAlias "Ethernet" `
  -IPAddress "2001:db8::10" `
  -PrefixLength 64 `
  -DefaultGateway "2001:db8::1"

# Verify that no temporary (Random) addresses remain
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv6 |
  Where-Object { $_.SuffixOrigin -eq "Random" } |
  Select-Object IPAddress, SuffixOrigin, PrefixOrigin
```

## Troubleshooting Privacy Extensions on Windows

```powershell
# Check whether IPv6 router discovery is enabled on the interface
Get-NetIPInterface -AddressFamily IPv6 |
  Select-Object InterfaceAlias, RouterDiscovery

# Temporary addresses are created only for SLAAC prefixes learned from router advertisements
Get-NetIPAddress -AddressFamily IPv6 |
  Where-Object { $_.PrefixOrigin -eq "RouterAdvertisement" } |
  Select-Object InterfaceAlias, IPAddress, SuffixOrigin, AddressState

# Reset IPv6 stack if privacy extensions stopped working
netsh interface ipv6 reset
# Then re-enable privacy extensions
Set-NetIPv6Protocol -UseTemporaryAddresses Enabled

# Inspect enabled ICMPv6-related firewall rules if local firewall policy is suspected
Get-NetFirewallRule | Where-Object { $_.Enabled -eq "True" -and $_.DisplayName -like "*ICMPv6*" }
```

Windows enables IPv6 privacy extensions by default. By default, temporary addresses are preferred for up to 1 day and valid for up to 7 days, and Windows generates replacement temporary addresses before the preferred lifetime expires. For enterprise environments, use Group Policy startup scripts or other configuration management to run the supported PowerShell or netsh commands across managed systems. Server systems that require stable addresses should explicitly disable temporary addresses and use statically configured IPv6 addresses instead.
