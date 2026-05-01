# Validation Summary: How to Display All IPv4 Network Adapters with ipconfig

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows `ipconfig`
- Windows `findstr`
- PowerShell `Get-NetIPAddress`
- PowerShell `Get-NetRoute`
- IPv4 network configuration

## Sources Consulted
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn, `findstr`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn, `Get-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Get-NetRoute`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netroute?view=windowsserver2025-ps

## Issues Found
- The introduction incorrectly said plain `ipconfig` shows DHCP lease information. Microsoft documents that `ipconfig` without parameters shows IPv4 and IPv6 addresses, subnet masks, and default gateways; I corrected the description and introduction to reserve fuller details for `ipconfig /all`.
- The `findstr` example used `Physical\|IPv4\|Gateway` as if `findstr` supported regex alternation with `|`. Microsoft documents a smaller regex feature set and does not list `|` alternation, so I replaced the command with supported `/c:` search strings.
- The "specific adapter" `ipconfig /all | more` example claimed it showed only the Ethernet adapter, but it only pages the full output. I corrected the comment so it accurately describes manual navigation.
- The PowerShell gateway example filtered routes by `NextHop -ne "0.0.0.0"`, which can include non-default routes. Microsoft documents `Get-NetRoute -DestinationPrefix "0.0.0.0/0"` for the default gateway case, so I updated the command and comment accordingly.
- The tag `Window` was corrected to `Windows`.

## Review Notes
- Example output formatting and adapter names can vary across Windows versions and interface types, but the corrected commands are current and valid for supported Windows versions documented by Microsoft.
