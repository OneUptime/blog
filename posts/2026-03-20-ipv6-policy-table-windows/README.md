# How to Configure the IPv6 Policy Table on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Policy Table, Window, RFC 6724, Address Selection, PowerShell

Description: Configure the IPv6 address selection policy table on Windows using netsh and PowerShell to control source and destination address preferences for dual-stack networking.

## Windows IPv6 Policy Table

Windows uses a configurable prefix policy table managed through `netsh` and PowerShell. The table influences both source address selection and destination address sorting.

## Viewing the Current Policy Table

```powershell
# PowerShell (Windows 8 / Windows Server 2012+): view the prefix policy table

Get-NetPrefixPolicy

# View current prefix policies with netsh
netsh interface ipv6 show prefixpolicies

# Output example:
# Active State   : enabled
# Prefix                          Precedence  Label
# --------------------------------  ----------  -----
# ::1/128                              50         0
# ::/0                                 40         1
# ::ffff:0:0/96                        35         4
# 2002::/16                            30         2
# 2001::/32                             5         5
# fc00::/7                              3        13
# ::/96                                 1         3
# fec0::/10                             1        11
# 3ffe::/16                             1        12
```

## Adding and Modifying Policy Entries

```powershell
# Add a new prefix policy entry
# netsh interface ipv6 add prefixpolicy [prefix=]<prefix> [precedence=]<precedence> [label=]<label>

# Example: add a custom prefix policy entry
netsh interface ipv6 add prefixpolicy 2001:db8:ffff::/48 precedence=45 label=1

# Example: prefer IPv4 over IPv6 (modify the built-in IPv4-mapped entry)
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=100 label=4

# Verify the change
netsh interface ipv6 show prefixpolicies

# Delete the custom entry
netsh interface ipv6 delete prefixpolicy 2001:db8:ffff::/48

# Reset all user-configured IPv6 settings (broader than prefix policies; restart required)
netsh interface ipv6 reset
```

## Preferring IPv4 on Windows

```powershell
# Method 1: Raise IPv4-mapped precedence via netsh
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=100 label=4

# Method 2: Disable IPv6 on specific adapters
# (nuclear option - removes IPv6 entirely from adapter)
Disable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Method 3: Prefer IPv4 via registry
# HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters
# DisabledComponents = 0x20 (prefer IPv4 over IPv6)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name "DisabledComponents" `
    -Value 0x20 `
    -Type DWord

# Note: registry method requires reboot; netsh takes effect immediately
```

## Preferring IPv6 (Restoring Defaults)

```powershell
# Restore the built-in IPv4-mapped entry to its default values
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=35 label=4

# Or reset all user-configured IPv6 settings (broader; requires restart)
netsh interface ipv6 reset

# Quick resolver-order check for a dual-stack host
# Replace example.com with a dual-stack host in your environment
[System.Net.Dns]::GetHostAddresses("example.com") | ForEach-Object {
    Write-Host "$($_.AddressFamily): $($_.IPAddressToString)"
}
# If IPv6 is preferred and usable, IPv6 addresses commonly appear first
```

## ULA Address Handling

```powershell
# Check if ULA addresses (fc00::/7) have correct label
netsh interface ipv6 show prefixpolicies | Select-String "fc00"

# ULA label should be 13 - same as ULA sources
# This keeps ULA-to-ULA communication preferred

# Add explicit ULA entry if missing
netsh interface ipv6 add prefixpolicy fc00::/7 precedence=3 label=13
```

## Scripting Policy Management

```powershell
# PowerShell script to reapply the default prefix-policy values shown above
# Useful after you modify built-in entries

function Set-IPv6DefaultPolicies {
    $policies = @(
        @{ Prefix = "::1/128";         Precedence = 50; Label = 0 },
        @{ Prefix = "::/0";            Precedence = 40; Label = 1 },
        @{ Prefix = "::ffff:0:0/96";   Precedence = 35; Label = 4 },
        @{ Prefix = "2002::/16";       Precedence = 30; Label = 2 },
        @{ Prefix = "2001::/32";       Precedence =  5; Label = 5 },
        @{ Prefix = "fc00::/7";        Precedence =  3; Label = 13 },
        @{ Prefix = "::/96";           Precedence =  1; Label = 3 },
        @{ Prefix = "fec0::/10";       Precedence =  1; Label = 11 },
        @{ Prefix = "3ffe::/16";       Precedence =  1; Label = 12 }
    )

    foreach ($p in $policies) {
        if (Get-NetPrefixPolicy -Prefix $p.Prefix -ErrorAction SilentlyContinue) {
            netsh interface ipv6 set prefixpolicy `
                "$($p.Prefix)" `
                "precedence=$($p.Precedence)" `
                "label=$($p.Label)" | Out-Null
        }
        else {
            netsh interface ipv6 add prefixpolicy `
                "$($p.Prefix)" `
                "precedence=$($p.Precedence)" `
                "label=$($p.Label)" | Out-Null
        }
        Write-Host "Set: $($p.Prefix) precedence=$($p.Precedence) label=$($p.Label)"
    }
}

Set-IPv6DefaultPolicies
```

## Testing Address Selection on Windows

```powershell
# Test which local source address Windows selects for a destination
# The first returned object is the selected local IP address; the second is the route
Find-NetRoute -RemoteIPAddress "2001:db8::1"

# Quick resolver-order check for a dual-stack host
# Replace example.com with a dual-stack host in your environment
[System.Net.Dns]::GetHostAddresses("example.com") | ForEach-Object {
    Write-Host "$($_.AddressFamily): $($_.IPAddressToString)"
}
```

## Group Policy for Enterprise Deployment

```powershell
# Apply IPv6 policy settings via Group Policy (GPO)
# Path: Computer Configuration > Windows Settings > Scripts (Startup)

# Startup script content (save as a .ps1 file and deploy via GPO):
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=100 label=4

# Alternatively, use GPO Registry settings:
# HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters
# DisabledComponents values:
# 0x00 = All IPv6 enabled (default)
# 0x10 = Disable IPv6 on non-tunnel interfaces
# 0x20 = Prefer IPv4 over IPv6 in prefix policies
# 0xFF = Disable IPv6 completely
```

## Conclusion

Windows IPv6 policy table management uses `netsh interface ipv6 set prefixpolicy` to modify built-in entries and `netsh interface ipv6 add prefixpolicy` for new prefixes. To prefer IPv4, raise `::ffff:0:0/96` precedence above 40 (the default `::/0` precedence). To restore the built-in IPv4-mapped entry, set it back to `precedence=35 label=4`; `netsh interface ipv6 reset` is broader and resets all user-configured IPv6 settings after restart. Enterprise environments can distribute policy via Group Policy startup scripts or the `DisabledComponents` registry value. Test changes with `Find-NetRoute -RemoteIPAddress ...` to inspect the selected local address.
