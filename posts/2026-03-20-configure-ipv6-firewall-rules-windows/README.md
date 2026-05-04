# How to Configure IPv6 Firewall Rules on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Firewall, Windows Firewall, PowerShell

Description: Learn how to configure Windows Firewall rules for IPv6 traffic using PowerShell and the Windows Firewall GUI, including allowing specific IPv6 addresses and blocking IPv6 subnets.

## Windows Firewall and IPv6

Windows Defender Firewall handles both IPv4 and IPv6 traffic. Firewall rules can be scoped to specific IPv6 addresses and subnets for fine-grained control.

```powershell
# View existing firewall rules that apply to IPv6

Get-NetFirewallRule | Where-Object {$_.Enabled -eq "True"} |
    Get-NetFirewallAddressFilter |
    Where-Object {$_.RemoteAddress -like "*:*"}
```

## Allow Inbound IPv6 Traffic on a Port

```powershell
# Allow inbound TCP on port 443 from any IPv6 address
New-NetFirewallRule `
    -Name "Allow-IPv6-HTTPS-Inbound" `
    -DisplayName "Allow HTTPS Inbound (IPv6)" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 443 `
    -RemoteAddress "::/0" `
    -Action Allow `
    -Enabled True

# Allow inbound SSH from a specific IPv6 subnet
New-NetFirewallRule `
    -Name "Allow-SSH-From-IPv6-Subnet" `
    -DisplayName "Allow SSH from 2001:db8::/32" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 22 `
    -RemoteAddress "2001:db8::/32" `
    -Action Allow `
    -Enabled True
```

## Block IPv6 Traffic

```powershell
# Block all inbound traffic from a specific IPv6 address
New-NetFirewallRule `
    -Name "Block-IPv6-Address" `
    -DisplayName "Block 2001:db8::bad:actor" `
    -Direction Inbound `
    -RemoteAddress "2001:db8::bad:ac70" `
    -Action Block `
    -Enabled True

# Block outbound to a specific IPv6 subnet
New-NetFirewallRule `
    -Name "Block-Outbound-IPv6-Subnet" `
    -DisplayName "Block Outbound to 2001:db8:bad::/48" `
    -Direction Outbound `
    -RemoteAddress "2001:db8:bad::/48" `
    -Action Block `
    -Enabled True
```

## Configure ICMPv6 Rules

```powershell
# Allow ICMPv6 (essential for IPv6 operation - do not block all ICMPv6)
New-NetFirewallRule `
    -Name "Allow-ICMPv6-Essential" `
    -DisplayName "Allow Essential ICMPv6" `
    -Direction Inbound `
    -Protocol ICMPv6 `
    -IcmpType 133,134,135,136,137 `
    -Action Allow `
    -Enabled True

# ICMPv6 types that must be allowed:
# 133 = Router Solicitation
# 134 = Router Advertisement
# 135 = Neighbor Solicitation
# 136 = Neighbor Advertisement
# 137 = Redirect
```

## Using netsh advfirewall for IPv6 Rules

```cmd
:: Add an inbound rule for IPv6 HTTPS
netsh advfirewall firewall add rule ^
    name="Allow IPv6 HTTPS" ^
    protocol=TCP ^
    dir=in ^
    localport=443 ^
    remoteip=::/0 ^
    action=allow

:: Block an IPv6 address
netsh advfirewall firewall add rule ^
    name="Block IPv6 Host" ^
    dir=in ^
    remoteip=2001:db8::bad:ac70 ^
    action=block

:: Show IPv6-related rules
netsh advfirewall firewall show rule name=all | findstr /i "ipv6 ::"
```

## Manage Rules via GUI

```sql
Steps:
1. Open Windows Defender Firewall with Advanced Security
   (wf.msc or search "Windows Firewall")

2. Click "Inbound Rules" or "Outbound Rules"

3. Click "New Rule..."

4. Select Rule Type: Port, Program, or Custom

5. For IPv6 scope:
   - In the "Scope" step, set Remote IP Addresses
   - Select "These IP addresses" and add IPv6 addresses/ranges

6. Click Finish
```

## View and Manage Existing Rules

```powershell
# List all enabled firewall rules
Get-NetFirewallRule -Enabled True | Select-Object Name, DisplayName, Direction, Action

# Get address filter details for a rule
Get-NetFirewallRule -Name "Allow-IPv6-HTTPS-Inbound" |
    Get-NetFirewallAddressFilter

# Disable a rule
Disable-NetFirewallRule -Name "Allow-IPv6-HTTPS-Inbound"

# Delete a rule
Remove-NetFirewallRule -Name "Allow-IPv6-HTTPS-Inbound"
```

## Summary

Configure Windows Firewall rules for IPv6 with `New-NetFirewallRule -RemoteAddress "2001:db8::/32"` in PowerShell or via the wf.msc GUI. Always allow essential ICMPv6 types (133-137) for IPv6 NDP to function. Block specific hosts or subnets with `-Action Block`. Use `Get-NetFirewallRule | Get-NetFirewallAddressFilter` to inspect existing rules. `netsh advfirewall firewall` provides equivalent command-line access.
