# Validation Summary: How to Enable IPv6 Forwarding on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Windows
- Windows Server
- PowerShell
- `netsh`
- Routing and Remote Access Service (RRAS)
- Windows Registry

## Sources Consulted
- Microsoft Learn: Get-NetIPInterface (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: Set-NetIPInterface (NetTCPIP) - https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipinterface?view=windowsserver2025-ps
- Microsoft Learn: `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Install and configure IP version 6 in Windows Server - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/install-configure-ip-version-6
- Microsoft Learn: Remote access overview - https://learn.microsoft.com/en-us/windows-server/remote/remote-access/remote-access
- Microsoft Learn: Roles, Role Services, and Features included in Windows Server - Server Core - https://learn.microsoft.com/en-us/windows-server/administration/server-core/server-core-roles-and-services
- Microsoft Learn: Set-ItemProperty (Microsoft.PowerShell.Management) - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.5
- Microsoft Learn: Appendix E: List of Security Settings - https://learn.microsoft.com/en-us/security-updates/windowsupdateservices/18128246

## Issues Found
- The `netsh interface ipv6 set global routerdiscovery=enabled` command was incorrect for enabling IPv6 forwarding. Router discovery is a different setting, and Microsoft documents forwarding as a per-interface setting. I replaced it with documented `netsh interface ipv6 set interface interface="..." forwarding=enabled` commands and updated the verification command to the current `show interfaces` syntax.
- The RRAS command sequence was inaccurate. `netsh routing ip install` is not the current documented way to enable LAN routing with RRAS, and the intermediate PowerShell object was unused. I replaced that block with `Install-RemoteAccess -VpnType RoutingOnly`, which Microsoft documents for installing Remote Access as a LAN router.
- The registry path for `IPEnableRouter` was wrong. The post used `HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters`, but Microsoft documents `IPEnableRouter` under `HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters`. I corrected the path and clarified that this is a global IP routing switch.
- The Windows desktop limitation claim was too absolute. Current Microsoft documentation shows Windows 10/11 exposing the same forwarding controls via `netsh interface`, while the full RRAS role is documented as a Windows Server feature. I updated the wording to reflect that distinction and removed the unsupported WSL2/Linux VM recommendation.
- The metadata tag `Window` was corrected to `Windows`.

## Review Notes
- Forwarding and router advertisements are separate settings on Windows. If a deployment relies on SLAAC or default-router advertisements, `advertise=enabled` may also be needed on the relevant interface.
- Enabling forwarding does not create routes automatically. Interfaces still need correct IPv6 addressing and routing entries for end-to-end packet flow.
