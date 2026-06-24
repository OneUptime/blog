# How to Configure IPv6 Firewall Rules on Windows Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Firewall, PowerShell, Netsh

Description: Learn how to configure IPv6 firewall rules on Windows using Windows Defender Firewall, PowerShell New-NetFirewallRule, and netsh advfirewall for controlling inbound and outbound IPv6 traffic.

## Overview

Windows Defender Firewall (formerly Windows Firewall) supports IPv6 natively alongside IPv4. Rules can be IPv6-specific using the `-RemoteAddress` and `-LocalAddress` parameters with IPv6 prefix notation. IPv6 rules work in both the GUI (Windows Security → Firewall & network protection → Advanced settings) and via PowerShell/netsh.

## Checking Current IPv6 Rules

```powershell
# PowerShell: List enabled inbound rules from the active store

Get-NetFirewallRule -PolicyStore ActiveStore -Direction Inbound -Enabled True |
  Select-Object DisplayName, Action

# Show active address filters that contain IPv6 literals
Get-NetFirewallAddressFilter -PolicyStore ActiveStore | Where-Object {
  $_.LocalAddress -like "*:*" -or $_.RemoteAddress -like "*:*"
}

# Netsh: Show all inbound firewall rules
netsh advfirewall firewall show rule name=all dir=in
```

## Creating IPv6-Specific Rules

### PowerShell: Allow/Deny by IPv6 Prefix

```powershell
# Allow SSH from IPv6 management network only
New-NetFirewallRule `
    -DisplayName "Allow SSH IPv6 from Management" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 22 `
    -RemoteAddress "fd00:1234:5678::/48" `
    -Action Allow `
    -Profile Any `
    -Enabled True

# Allow HTTPS inbound from any IPv6
New-NetFirewallRule `
    -DisplayName "Allow HTTPS IPv6 Inbound" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 443 `
    -LocalAddress "::/0" `
    -RemoteAddress "::/0" `
    -Action Allow `
    -Enabled True

# Block specific IPv6 attacker prefix
New-NetFirewallRule `
    -DisplayName "Block IPv6 Attacker" `
    -Direction Inbound `
    -RemoteAddress "2001:db8:bad::/48" `
    -Action Block `
    -Enabled True
```

### Netsh: Alternative Method

```cmd
:: Allow RDP from management IPv6 prefix
netsh advfirewall firewall add rule name="Allow RDP IPv6 Mgmt" ^
    dir=in action=allow protocol=tcp localport=3389 ^
    remoteip=fd00:1234:5678::/48

:: Block a specific IPv6 prefix
netsh advfirewall firewall add rule name="Block IPv6 Prefix" ^
    dir=in action=block protocol=any ^
    remoteip=2001:db8:bad::/48

:: Delete a rule
netsh advfirewall firewall delete rule name="Block IPv6 Prefix"
```

## ICMPv6 Rules

Windows uses ICMPv6 for Neighbor Discovery and PMTUD. These are typically already configured:

```powershell
# Check existing ICMPv6 rules
Get-NetFirewallRule -PolicyStore ActiveStore | Where-Object { $_.DisplayName -like "*ICMPv6*" } |
  Select-Object DisplayName, Enabled, Action

# Allow Packet Too Big (required for PMTUD) - should be pre-configured
New-NetFirewallRule `
    -DisplayName "Allow ICMPv6 Packet Too Big" `
    -Direction Inbound `
    -Protocol ICMPv6 `
    -IcmpType 2 `
    -Action Allow `
    -Enabled True

# Allow Neighbor Solicitation/Advertisement if needed
New-NetFirewallRule `
    -DisplayName "Allow ICMPv6 Neighbor Solicitation" `
    -Direction Inbound `
    -Protocol ICMPv6 `
    -IcmpType 135 `
    -Action Allow `
    -Enabled True

New-NetFirewallRule `
    -DisplayName "Allow ICMPv6 Neighbor Advertisement" `
    -Direction Inbound `
    -Protocol ICMPv6 `
    -IcmpType 136 `
    -Action Allow `
    -Enabled True
```

## Default Profile Settings

Windows Firewall applies different rules per network profile:

```powershell
# View current firewall profile settings
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction

# Set the Public profile default inbound action to Block
Set-NetFirewallProfile -Profile Public -DefaultInboundAction Block

# Enable firewall on all profiles
Set-NetFirewallProfile -Profile Domain,Private,Public -Enabled True
```

## Export and Import Rules (Backup)

```powershell
# Export all firewall rules to file
netsh advfirewall export "C:\firewall-backup.wfw"

# Import rules from backup
netsh advfirewall import "C:\firewall-backup.wfw"

# Export via PowerShell to JSON (for audit)
Get-NetFirewallRule -PolicyStore ActiveStore | ConvertTo-Json | Out-File "C:\firewall-rules.json"
```

## Group Policy for IPv6 Firewall (Enterprise)

For domain-joined machines, manage firewall rules via Group Policy:

```text
Computer Configuration → Policies → Windows Settings → Security Settings →
Windows Defender Firewall with Advanced Security →
Inbound Rules → New Rule

Protocol: TCP
Port: 22
Remote IP Address: fd00:1234:5678::/48  (IPv6 CIDR format)
Action: Allow
Profile: Domain, Private, Public
Name: Allow SSH IPv6 Management
```

## Monitoring and Logging

```powershell
# Enable firewall logging
Set-NetFirewallProfile -Profile Domain,Private,Public `
    -LogFileName "%systemroot%\system32\LogFiles\Firewall\pfirewall.log" `
    -LogMaxSizeKilobytes 4096 `
    -LogBlocked True `
    -LogAllowed True

# View log file
Get-Content "C:\Windows\System32\LogFiles\Firewall\pfirewall.log" |
  Where-Object { $_ -match "::1|::2|2001:" } | Select-Object -Last 50
```

## Summary

Windows Firewall IPv6 rules use `New-NetFirewallRule` with IPv6 values in `-RemoteAddress` and `-LocalAddress` for IPv6 CIDR matching and IPv6-only scoping. Ensure essential ICMPv6 traffic such as Packet Too Big (type 2) and Neighbor Solicitation/Advertisement (types 135/136) is allowed - Windows typically pre-configures these. Use `-Profile Any` for rules that should apply regardless of network profile, and rely on the profile's default inbound action instead of overlapping explicit block-all rules. Export firewall rules with `netsh advfirewall export` for backup and change management. In enterprise environments, use Group Policy to consistently apply IPv6 firewall rules across domain machines.
