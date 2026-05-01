# Validation Summary: How to Disable IPv6 Transition Technologies on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- IPv6
- Teredo
- ISATAP
- 6to4
- `netsh`
- PowerShell registry configuration
- Group Policy

## Sources Consulted
- Microsoft Learn, "Configure IPv6 for advanced users - Windows Server": https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn, "`netsh interface`": https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, "`Get-NetAdapter`": https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapter?view=windowsserver2025-ps
- Microsoft Learn, "`Set-ItemProperty`": https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.5

## Issues Found
- The Teredo registry explanation was incorrect. The post said `0x08` affected preferred IPv6 source selection and that `0x40` was the Teredo-only value. Microsoft documents bit `0x08` as the Teredo disable bit. I corrected the explanation and kept the Teredo-only example at `0x08`.
- The combined registry example used `0x70` and described it as the sum of ISATAP, 6to4, and Teredo bits. That bitmask mapping was incorrect. I changed the post to use Microsoft's documented `DisabledComponents=0x01` value for disabling all IPv6 tunnel interfaces, which covers 6to4, ISATAP, and Teredo.
- The registry sections implied persistence without noting activation timing. Microsoft documents these `DisabledComponents` changes as registry configuration that takes effect after restart, so I added restart notes where the registry value is used.
- The verification snippet used `Get-NetAdapter` without `-IncludeHidden`, which can miss hidden tunnel adapters. I updated the command to include hidden adapters and to filter for adapters whose status is `Up`, matching the comment about active tunnels.
- The metadata tag used `Window` instead of `Windows`. I corrected that technology name.

## Review Notes
- Microsoft documents that ISATAP and Teredo are disabled by default in Windows. The post is still valid as explicit hardening guidance and for hosts where those settings were changed.
- The Windows commands were reviewed against Microsoft documentation, but they were not executed in this Linux-based review environment.
