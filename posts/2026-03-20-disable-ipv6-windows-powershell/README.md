# How to Disable IPv6 on Windows via PowerShell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, PowerShell, Network Configuration, Disable IPv6

Description: Learn how to disable IPv6 on Windows using PowerShell commands, covering adapter binding, registry methods, and how to disable IPv6 on specific or all network adapters.

## Disable IPv6 Adapter Binding

The quickest way to disable IPv6 via PowerShell without a registry change or reboot:

```powershell
# Disable IPv6 on a specific adapter

Disable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Disable IPv6 on all visible adapters
Disable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6

# Verify
Get-NetAdapterBinding -ComponentID ms_tcpip6 | Select-Object Name, Enabled
# Enabled should show False for all visible adapters
```

## Re-enable IPv6 Adapter Binding

```powershell
# Re-enable on a specific adapter
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Re-enable on all visible adapters
Enable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6
```

## Disable IPv6 via Registry (Requires Restart)

For a broader disable that applies after restart and also affects IPv6 tunnel interfaces:

```powershell
# Set the IPv6 DisabledComponents registry value
$path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"

# Create key if it doesn't exist
if (-not (Test-Path $path)) {
    New-Item -Path $path -Force | Out-Null
}

# Set DisabledComponents = 0xFF (Windows still keeps IPv6 loopback enabled)
New-ItemProperty -Path $path `
    -Name DisabledComponents `
    -PropertyType DWord `
    -Value 0xFF `
    -Force

Write-Host "Reboot required for registry change to take effect."
```

## Disable IPv6 on Specific Adapter Only

```powershell
# List visible adapters with their IPv6 binding status
Get-NetAdapterBinding -ComponentID ms_tcpip6 |
    Select-Object Name, DisplayName, Enabled |
    Format-Table -AutoSize

# Disable on Wi-Fi but keep enabled on Ethernet
Disable-NetAdapterBinding -Name "Wi-Fi" -ComponentID ms_tcpip6
```

## Script: Disable IPv6 Binding and Set Registry Policy

```powershell
# Disable IPv6 binding and set DisabledComponents
function Disable-IPv6BindingAndRegistry {
    param([switch]$Force)

    # Step 1: Disable binding on all visible adapters (immediate effect)
    $adapters = Get-NetAdapter | Select-Object -ExpandProperty Name
    foreach ($adapter in $adapters) {
        Disable-NetAdapterBinding -Name $adapter -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
        Write-Host "Disabled IPv6 binding on: $adapter"
    }

    # Step 2: Set registry for a broader disable after restart
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name DisabledComponents -Value 0xFF -Type DWord
    Write-Host "Registry DisabledComponents set to 0xFF"

    if ($Force) {
        Restart-Computer -Force
    } else {
        Write-Host "Please restart the computer to complete the change."
    }
}

# Run it
Disable-IPv6BindingAndRegistry
```

## Verify IPv6 is Disabled

```powershell
# Check adapter binding
Get-NetAdapterBinding -ComponentID ms_tcpip6

# Check for any remaining IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6 | Where-Object {$_.IPAddress -ne "::1"}

# Check registry
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters").DisabledComponents

# Loopback should still respond; Windows keeps IPv6 internally enabled
ping ::1
```

## Summary

Disable IPv6 on Windows via PowerShell using `Disable-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6` for an immediate, no-reboot method that disables the TCP/IPv6 binding on all visible adapters. For a broader disable that also affects IPv6 tunnel interfaces after restart, set the `DisabledComponents` registry value to `0xFF`. Re-enable with `Enable-NetAdapterBinding`. Note: Microsoft does not recommend disabling IPv6, and Windows still keeps IPv6 loopback/internal functionality enabled.
