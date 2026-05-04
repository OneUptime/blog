# How to Configure Teredo on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Teredo, Window, NAT, Tunneling

Description: Learn how to configure, verify, and disable Teredo IPv6 tunneling on Windows using netsh and PowerShell commands, including enterprise disablement via Group Policy.

## Overview

Teredo on Windows is managed via `netsh interface teredo` commands and PowerShell's `Set-NetTeredoConfiguration`. In most modern environments, Teredo should be disabled in favor of native IPv6 or left dormant (Windows auto-disables it when native IPv6 is available). This article covers checking status, enabling for testing, and disabling for security.

## Check Teredo Status

```powershell
# PowerShell

Get-NetTeredoConfiguration

# Example output:
# PolicyStore   : ActiveStore
# Type          : default
# ServerName    : teredo.ipv6.microsoft.com
# RefreshInterval : 0
# ClientPort    : 0
# ServerVirtualIP : ::
# DefaultQualified : True
# WindowsSecurityZoneFlags : 131
```

```cmd
:: CMD / netsh
netsh interface teredo show state

:: Sample states:
:: Type       : dormant       ← inactive (native IPv6 available)
:: Type       : client        ← active
:: Type       : disabled      ← fully disabled
```

## Teredo States Explained

| State | Meaning |
|---|---|
| `dormant` | Installed but inactive - native IPv6 available |
| `client` | Active - providing IPv6 via Teredo |
| `offline` | No Teredo server reachable |
| `disabled` | Fully disabled |
| `probe` | Determining type of NAT |

## Enable Teredo (for Testing)

```cmd
:: Enable Teredo
netsh interface teredo set state type=client

:: Set specific server
netsh interface teredo set state servername=teredo.ipv6.microsoft.com

:: Re-enable with default settings
netsh interface teredo set state type=default

:: Force qualification
netsh interface teredo set state type=enterpriseclient
```

```powershell
# PowerShell
Set-NetTeredoConfiguration -Type Client
Set-NetTeredoConfiguration -ServerName "teredo.ipv6.microsoft.com"
```

## Verify Teredo Address and Connectivity

```cmd
:: Check Teredo address (2001::/32 range)
ipconfig | findstr "2001:"

:: Full interface details
netsh interface ipv6 show address

:: Check routing - Teredo should appear as a route
netsh interface ipv6 show route | findstr "2001"

:: Test connectivity
ping 2001:4860:4860::8888
```

```powershell
# Get Teredo IPv6 address
Get-NetIPAddress | Where-Object { $_.IPAddress -like "2001:0:*" }

# Test connection through Teredo
Test-NetConnection -ComputerName "ipv6.google.com" -InformationLevel Detailed
```

## Disable Teredo

```cmd
:: Disable Teredo completely
netsh interface teredo set state disabled

:: Verify
netsh interface teredo show state
:: Type : disabled
```

```powershell
# PowerShell
Set-NetTeredoConfiguration -Type Disabled

# Verify
Get-NetTeredoConfiguration | Select-Object Type
```

## Enterprise Disablement via Group Policy

```text
Computer Configuration →
  Administrative Templates →
    Network →
      TCPIP Settings →
        IPv6 Transition Technologies →
          Set Teredo State → Disabled

Or via registry:
HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters
  Value: DisabledComponents = 0x8 (Teredo only); 0x1 disables all tunnel
         interfaces (Teredo, 6to4, ISATAP, IP-HTTPS); 0xFF disables all
         IPv6 components except the loopback interface
```

```powershell
# Apply via PowerShell (registry)
# Disable Teredo via registry flag
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
$current = Get-ItemPropertyValue -Path $regPath -Name "DisabledComponents" -ErrorAction SilentlyContinue
if ($null -eq $current) { $current = 0 }
Set-ItemProperty -Path $regPath -Name "DisabledComponents" -Value ($current -bor 8)
```

## Disable All IPv6 Transition Technologies

```powershell
# Disable 6to4, Teredo, and ISATAP together
Set-Net6to4Configuration -State Disabled
Set-NetTeredoConfiguration -Type Disabled
Set-NetIsatapConfiguration -State Disabled

# Verify all disabled
Get-Net6to4Configuration | Select-Object State
Get-NetTeredoConfiguration | Select-Object Type
Get-NetIsatapConfiguration | Select-Object State
```

## Block Teredo at the Firewall

Even if Teredo is disabled on endpoints, block at network level:

```powershell
# Block Teredo server communication (UDP 3544)
New-NetFirewallRule `
    -DisplayName "Block Teredo (UDP 3544)" `
    -Direction Outbound `
    -Protocol UDP `
    -RemotePort 3544 `
    -Action Block `
    -Enabled True `
    -Profile Any

# Block inbound Teredo
New-NetFirewallRule `
    -DisplayName "Block Teredo Inbound (UDP 3544)" `
    -Direction Inbound `
    -Protocol UDP `
    -LocalPort 3544 `
    -Action Block `
    -Enabled True `
    -Profile Any
```

## Detect Active Teredo

```powershell
# Check all machines on domain for active Teredo (requires remoting)
$computers = Get-ADComputer -Filter * | Select-Object -ExpandProperty Name
foreach ($computer in $computers) {
    $result = Invoke-Command -ComputerName $computer -ScriptBlock {
        Get-NetTeredoConfiguration | Select-Object Type
    } -ErrorAction SilentlyContinue
    if ($result.Type -eq "Client") {
        Write-Warning "$computer: Teredo is ACTIVE"
    }
}
```

## Summary

Teredo on Windows is managed with `netsh interface teredo set state disabled` or `Set-NetTeredoConfiguration -Type Disabled`. Modern Windows (11) disables it by default when native IPv6 is available, but older systems (7, 8, Server 2012-2019) may have it active. Disable Teredo on all enterprise systems via Group Policy or PowerShell, block UDP 3544 at the network perimeter, and use `Get-NetTeredoConfiguration` to audit current state. Combine with disabling 6to4 and ISATAP to eliminate all IPv6 transition tunneling.
