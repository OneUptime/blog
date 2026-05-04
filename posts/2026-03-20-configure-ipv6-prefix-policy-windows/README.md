# How to Configure IPv6 Prefix Policy on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Prefix Policy, Address Selection, RFC 6724

Description: Learn how to view and modify the IPv6 prefix policy table on Windows (RFC 6724) to control address selection precedence for outgoing connections.

## What is the IPv6 Prefix Policy Table?

The prefix policy table (RFC 6724) determines the preference order when selecting source and destination addresses for outgoing IPv6 connections. Windows uses this table to decide whether to prefer IPv6 or IPv4 and which IPv6 address type to use.

```cmd
:: View the current prefix policy table
netsh interface ipv6 show prefixpolicies

:: Output:
:: Querying active state...
::
:: Precedence  Label  Prefix
:: ----------  -----  --------------------------------
::         50      0  ::1/128
::         40      1  ::/0
::         35      4  ::ffff:0:0/96
::         30      2  2002::/16
::          5      5  2001::/32
::          3     13  fc00::/7
::          1     11  fec0::/10
::          1     12  3ffe::/16
::          1      3  ::/96
```

## Understanding Prefix Policy Fields

| Field | Description |
|-------|-------------|
| Precedence | Higher = preferred (50 is most preferred) |
| Label | Used for source address selection (match source/dest labels) |
| Prefix | Address prefix this rule applies to |

## IPv4 vs IPv6 Preference

Windows defaults to preferring IPv6 over IPv4 for dual-stack connections. This is controlled by the `::ffff:0:0/96` entry (IPv4-mapped addresses):

```cmd
:: Default: ::ffff:0:0/96 has precedence 35, ::/0 has precedence 40
:: This means IPv6 (::/0) is preferred over IPv4-mapped (::ffff:0:0/96)

:: To prefer IPv4 over IPv6, increase the IPv4-mapped precedence:
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=46 label=4

:: Revert to default
netsh interface ipv6 delete prefixpolicy ::ffff:0:0/96
```

## Adding Custom Prefix Policies

```cmd
:: Add a new prefix policy
netsh interface ipv6 add prefixpolicy 2001:db8::/32 precedence=45 label=6

:: Modify an existing policy
netsh interface ipv6 set prefixpolicy 2001:db8::/32 precedence=50 label=6

:: Delete a prefix policy
netsh interface ipv6 delete prefixpolicy 2001:db8::/32

:: Reset to Windows defaults
netsh interface ipv6 reset
```

## PowerShell for Prefix Policies

```powershell
# No built-in PowerShell cmdlets for prefix policy table

# Use netsh via PowerShell:
$policies = netsh interface ipv6 show prefixpolicies
$policies

# Parse output for scripting
netsh interface ipv6 show prefixpolicies |
    Select-String "\d+" |
    ForEach-Object { $_.Line.Trim() }
```

## Prefer IPv4 for Legacy Applications

```cmd
:: Some legacy apps have IPv6 compatibility issues
:: Temporarily prefer IPv4 by raising its precedence above IPv6

:: Current: IPv4-mapped = 35, IPv6 default = 40
:: Change IPv4-mapped to higher than IPv6 default:
netsh interface ipv6 set prefixpolicy ::ffff:0:0/96 precedence=46 label=4
netsh interface ipv6 set prefixpolicy ::/0 precedence=40 label=1

:: Test connectivity
ping google.com
:: Should now use IPv4

:: Revert:
netsh interface ipv6 delete prefixpolicy ::ffff:0:0/96
```

## Summary

The IPv6 prefix policy table (viewed with `netsh interface ipv6 show prefixpolicies`) controls address selection precedence per RFC 6724. Higher precedence values win. By default, Windows prefers IPv6 (`::/0` at precedence 40) over IPv4-mapped (`::ffff:0:0/96` at precedence 35). Adjust precedence with `netsh interface ipv6 set prefixpolicy` to force IPv4 preference when needed. Reset to defaults with `netsh interface ipv6 reset`.
