# Validation Summary: How to Disable Teredo on Windows to Prevent IPv6 Leaks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows networking
- Teredo
- IPv6 transition technologies
- PowerShell
- `netsh`
- Windows Registry
- Group Policy
- Windows Firewall

## Sources Consulted
- Microsoft Learn: Guidance for configuring IPv6 in Windows for advanced users - https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: netsh interface - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Set-NetTeredoConfiguration - https://learn.microsoft.com/en-us/powershell/module/networktransition/set-netteredoconfiguration?view=windowsserver2025-ps
- Microsoft Learn: Set-Net6to4Configuration - https://learn.microsoft.com/en-us/powershell/module/networktransition/set-net6to4configuration?view=windowsserver2025-ps
- Microsoft Learn: Set-NetIsatapConfiguration - https://learn.microsoft.com/en-us/powershell/module/networktransition/set-netisatapconfiguration?view=windowsserver2025-ps
- Microsoft Learn: Manage connections from Windows 10 and Windows 11 Server/Enterprise editions operating system components to Microsoft services - https://learn.microsoft.com/en-us/windows/privacy/manage-connections-from-windows-operating-system-components-to-microsoft-services
- Microsoft Learn: Required Firewall Exceptions for Teredo - https://learn.microsoft.com/en-us/windows/win32/teredo/required-firewall-exceptions-for-teredo
- Microsoft Learn: Implementing the Teredo Security Model - https://learn.microsoft.com/en-us/windows/win32/teredo/implementing-the-teredo-security-model
- Microsoft Learn: Implementing Firewall Filters for Teredo - https://learn.microsoft.com/en-us/windows/win32/teredo/implementing-firewall-filters-for-teredo
- IETF RFC 4380: Teredo: Tunneling IPv6 over UDP through Network Address Translations (NATs) - https://www.ietf.org/rfc/rfc4380.txt

## Issues Found
- The overview said Teredo was enabled or dormant by default on Windows Vista through Windows 10. Microsoft’s current guidance says ISATAP and Teredo are disabled by default in supported Windows versions, so the overview was updated to match current documentation.
- The overview also claimed Teredo bypasses IPv4 firewalls and attributed disablement guidance to NIST, NSA, and CIS without documentation in the post. Microsoft documents a host-firewall security model for Teredo, so the unsupported claim and unsupported attributions were removed.
- The verification section mixed up Teredo configuration `Type` values with the operational `State` field and showed `Type : dormant`, which is not a documented Teredo type. The post now uses valid `Type` values for enabled configurations and `State : dormant` for the idle state.
- The registry bitmask table incorrectly listed `0x20` as the flag for disabling 6to4. Microsoft documents `0x02` for 6to4, `0x04` for ISATAP, `0x08` for Teredo, and `0x01` for all tunnel interfaces, so the table was corrected.
- The Group Policy note labeled `HKLM\Software\Policies\Microsoft\Windows\TCPIP\v6Transition` as an ADMX path even though it is the backing policy registry key. The wording was corrected.
- The mass-deployment firewall example used an inbound `LocalPort 3544` rule even though Microsoft documents that Teredo client UDP ports can be chosen dynamically. The example was adjusted to present UDP 3544 as the standard server/relay port defense-in-depth control, and the verification section now uses `netsh interface teredo show state` instead of an unreliable adapter-list check.

## Review Notes
- Microsoft warns against broadly disabling IPv6 components unless necessary because some Windows features depend on IPv6. The post is now scoped to disabling Teredo and other transition mechanisms rather than disabling native IPv6.
- Microsoft notes that disabling Teredo can affect some Xbox networking features and Delivery Optimization peering on Windows 10 and Windows 11.
