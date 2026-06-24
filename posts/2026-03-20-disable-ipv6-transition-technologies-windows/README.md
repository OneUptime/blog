# How to Disable IPv6 Transition Technologies on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Teredo, ISATAP, 6to4, Security

Description: Learn how to disable Teredo, ISATAP, and 6to4 IPv6 transition technologies on Windows to reduce attack surface, prevent unexpected tunnel traffic, and avoid connectivity issues on native...

## Why Disable Transition Technologies?

On networks with native IPv6, legacy transition tunnels can:
- Create unexpected outbound traffic bypassing firewalls
- Introduce security exposure (Teredo bypasses some firewalls)
- Cause connectivity issues when native IPv6 is available
- Interfere with network monitoring and logging

## Disable Teredo

```cmd
:: Disable Teredo client
netsh interface teredo set state type=disabled

:: Verify
netsh interface teredo show state
:: Type should show: disabled
```

```powershell
# Disable via registry (takes effect after restart)

Set-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents `
    -Value 0x08 `
    -Type DWord
# Bit 3 (0x08) disables Teredo
# Restart Windows after changing DisabledComponents
```

## Disable 6to4

```cmd
:: Disable 6to4
netsh interface 6to4 set state disabled

:: Verify
netsh interface 6to4 show state
:: State should show: disabled
```

## Disable ISATAP

```cmd
:: Disable ISATAP
netsh interface isatap set state disabled

:: Verify
netsh interface isatap show state
:: State should show: disabled
```

## Disable All Three with One Script

```powershell
# Comprehensive script to disable all IPv6 transition technologies

Write-Host "Disabling IPv6 transition technologies..."

# Disable Teredo
netsh interface teredo set state type=disabled
Write-Host "Teredo: disabled"

# Disable 6to4
netsh interface 6to4 set state disabled
Write-Host "6to4: disabled"

# Disable ISATAP
netsh interface isatap set state disabled
Write-Host "ISATAP: disabled"

# Also disable all IPv6 tunnel interfaces via registry (takes effect after restart)
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
# 0x01 disables all IPv6 tunnel interfaces, including 6to4, ISATAP, and Teredo
Set-ItemProperty -Path $regPath -Name DisabledComponents -Value 0x01 -Type DWord
Write-Host "Registry DisabledComponents set to 0x01 (all IPv6 tunnel interfaces disabled after restart)"

Write-Host ""
Write-Host "Verification:"
netsh interface teredo show state | Select-String "Type"
netsh interface 6to4 show state | Select-String "State"
netsh interface isatap show state | Select-String "State"
```

## Using Group Policy to Disable Across Enterprise

```text
Group Policy path:
Computer Configuration →
  Administrative Templates →
    Network →
      TCPIP Settings →
        IPv6 Transition Technologies

Settings to configure:
- Set Teredo State = Disabled
- Set 6to4 State = Disabled
- Set ISATAP State = Disabled
```

## Verify All Tunnels are Disabled

```powershell
# Check all tunnel adapters
Get-NetAdapter -IncludeHidden | Where-Object {
    $_.Status -eq "Up" -and $_.InterfaceDescription -match "Tunnel|Teredo|ISATAP|6to4|Microsoft 6to4"
}

# Should show no active tunnel adapters

# Check state of each
Write-Host "=== Teredo ==="
netsh interface teredo show state

Write-Host "=== 6to4 ==="
netsh interface 6to4 show state

Write-Host "=== ISATAP ==="
netsh interface isatap show state

# Check registry
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents -ErrorAction SilentlyContinue).DisabledComponents
```

## Summary

Disable legacy IPv6 transition technologies on Windows with `netsh interface teredo/6to4/isatap set state disabled`. For registry-based persistence, set the `DisabledComponents` registry value to `0x01` to disable all IPv6 tunnel interfaces, including 6to4, ISATAP, and Teredo, and then restart Windows. Use Group Policy for enterprise-wide deployment. These tunnels are unnecessary on native dual-stack networks and should be disabled to reduce attack surface and prevent unexpected traffic patterns.
