# How to Disable IPv6 on Windows via Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Registry, Network Configuration, Disable IPv6

Description: Learn how to disable IPv6 on Windows by modifying the DisabledComponents registry key, including the different bitmask values that control which IPv6 components are disabled.

## The DisabledComponents Registry Key

Windows controls IPv6 behavior through the `DisabledComponents` DWORD value in the registry. Each bit controls a different aspect of IPv6:

```text
Registry path:
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters

Value: DisabledComponents (DWORD)
```

## DisabledComponents Bitmask Values

| Bit | Value | Effect |
|-----|-------|--------|
| 0 | 0x01 | Disable IPv6 on all tunnel interfaces |
| 1 | 0x02 | Disable the IPv6 6to4 interface |
| 2 | 0x04 | Disable the IPv6 ISATAP interface |
| 3 | 0x08 | Disable the IPv6 Teredo interface |
| 4 | 0x10 | Disable IPv6 on all nontunnel interfaces (also PPP) |
| 5 | 0x20 | Prefer IPv4 over IPv6 in default prefix policies |
| 6 | 0x40 | Disable the IPv6 CP interface |
| 7 | 0x80 | Disable the IPv6 IP-TLS interface |
| all | 0xFF | Disable IPv6 on all interfaces (Windows still keeps internal IPv6 loopback support) |

## Disabling IPv6 via Registry (Manual)

```text
1. Open Registry Editor: Win + R → regedit
2. Navigate to:
   HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters
3. Right-click → New → DWORD (32-bit) Value
4. Name: DisabledComponents
5. Value: 0xFF (to disable IPv6 on all interfaces)
6. Restart the computer
```

## Disabling IPv6 via PowerShell (Registry Method)

```powershell
# Run in an elevated PowerShell session
# Disable IPv6 on all interfaces

$registryPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"

# Check if key exists
if (!(Test-Path $registryPath)) {
    New-Item -Path $registryPath -Force
}

# Set DisabledComponents to 0xFF (disable IPv6 on all interfaces)
Set-ItemProperty -Path $registryPath `
    -Name "DisabledComponents" `
    -Value 0xFF `
    -Type DWord

Write-Host "IPv6 disabled via registry. Restart required."

# Restart to apply
Restart-Computer -Confirm
```

## Disabling Only Tunnel Interfaces (Keep LAN IPv6)

```powershell
# Disable all tunnel interfaces but keep native IPv6 on LAN
Set-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name "DisabledComponents" `
    -Value 0x01 `
    -Type DWord
```

## Re-enabling IPv6

```powershell
# Set DisabledComponents to 0 (re-enable all)
Set-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name "DisabledComponents" `
    -Value 0 `
    -Type DWord

# Or remove the value entirely (same effect as 0)
Remove-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name "DisabledComponents" `
    -ErrorAction SilentlyContinue

Restart-Computer
```

## Verifying the Change

```powershell
# Before restart: check registry value
Get-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name "DisabledComponents"

# After restart: verify IPv6 is disabled
Get-NetIPAddress -AddressFamily IPv6
# Adapter-scoped IPv6 addresses on disabled interfaces should be gone after restart.
# Windows still keeps the IPv6 loopback (::1) internally, even with DisabledComponents = 0xFF.

# Check adapter binding
# This can still show IPv6 as enabled because DisabledComponents does not unbind ms_tcpip6.
Get-NetAdapterBinding -Name "*" -ComponentID ms_tcpip6
```

## Summary

Disable IPv6 on Windows by setting `DisabledComponents` DWORD in `HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters`. Use `0xFF` to disable IPv6 on all interfaces, or `0x01` to disable only tunnel interfaces. A system restart is required for registry changes to take effect. Re-enable by setting the value to `0` or removing it entirely. Microsoft recommends preferring IPv4 over IPv6 with `0x20` instead of disabling IPv6 when possible, and notes that values other than `0` or `32` can cause the Routing and Remote Access service to fail after restart.
