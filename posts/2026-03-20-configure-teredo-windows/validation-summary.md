# Validation Summary: How to Configure Teredo on Windows

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Teredo (IPv6 transition tunneling protocol, RFC 4380)
- Windows `netsh interface teredo` CLI
- Windows PowerShell `NetworkTransition` module (`Get-NetTeredoConfiguration`, `Set-NetTeredoConfiguration`, `Set-Net6to4Configuration`, `Set-NetIsatapConfiguration`)
- Windows registry `HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters\DisabledComponents`
- Windows Group Policy (IPv6 Transition Technologies)
- Windows Firewall (`New-NetFirewallRule`)
- Active Directory remoting (`Get-ADComputer`, `Invoke-Command`)

## Sources Consulted
- [Microsoft Learn — Set-NetTeredoConfiguration](https://learn.microsoft.com/en-us/powershell/module/networktransition/set-netteredoconfiguration?view=windowsserver2025-ps) — verified valid `-Type` values (Default, Relay, Client, Server, Disabled, Automatic, Enterpriseclient, Natawareclient) and parameter names.
- [Microsoft Learn — Get-NetTeredoConfiguration](https://learn.microsoft.com/en-us/powershell/module/networktransition/get-netteredoconfiguration?view=windowsserver2025-ps) — verified cmdlet syntax and output object.
- [Microsoft Learn — Configure IPv6 for advanced users (KB 929852)](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows) — verified `DisabledComponents` bit semantics: bit 0 (0x01) disables all tunnel interfaces, bit 3 (0x08) disables Teredo specifically, bit 4 (0x10) disables non-tunnel interfaces, 0xFF disables all IPv6 except loopback.
- [WinCert — Breaking down DisabledComponents](https://www.wincert.net/networking/ipv6-breaking-down-the-disabledcomponents-registry-value/) — cross-reference for the same bit semantics.
- RFC 4380 — Teredo prefix `2001::/32` and UDP port 3544.

## Issues Found
- **Misleading description of the `0xFF` `DisabledComponents` value.** The original text read `Value: DisabledComponents = 0x8 (or 0xFF to disable all IPv6 transition)`. Per Microsoft KB 929852, `0xFF` actually disables **all** IPv6 components (except the loopback interface), not just transition technologies. The correct value to disable just IPv6 tunnel/transition interfaces is `0x1` (bit 0). I expanded the registry comment to clarify all three values: `0x8` for Teredo only, `0x1` for all tunnel interfaces (Teredo, 6to4, ISATAP, IP-HTTPS), and `0xFF` for disabling IPv6 entirely except loopback.

## Review Notes
- The `ServerName : teredo.ipv6.microsoft.com` value shown in the example `Get-NetTeredoConfiguration` output reflects the Windows 7 / Server 2008 R2 default. The default on Windows 10 / 11 / Server 2016+ is `win10.ipv6.microsoft.com`. Both server names are historically valid and the example is presented as a sample (not a guaranteed default), so I did not modify it — but readers running the cmdlet on a recent Windows host will likely see `win10.ipv6.microsoft.com` instead.
- Microsoft has been progressively retiring its public Teredo servers (`teredo.ipv6.microsoft.com` and `win10.ipv6.microsoft.com` have been intermittently/permanently unavailable in recent years). The post's stance — "Teredo should be disabled in favor of native IPv6" — is therefore well-aligned with current operational reality, but the "Enable Teredo (for Testing)" section may not produce a working tunnel on a default Windows 10/11 install pointing at the Microsoft default server.
- All `netsh interface teredo` flag forms in the post (`set state type=client|default|enterpriseclient|disabled` and `set state disabled` positional shorthand) are valid.
- All PowerShell `-Type` values used (`Client`, `Disabled`) are in the documented accepted set.
- The Teredo state `qualifying` is also commonly seen in `netsh interface teredo show state` output but is not in the table; not strictly an error since the table covers the most common states.
- The `WindowsSecurityZoneFlags` property in the example `Get-NetTeredoConfiguration` output is undocumented in Microsoft Learn but is observed in real cmdlet output, so it is left as-is.
- Teredo prefix `2001::/32` (RFC 4380), UDP port 3544, and Google Public DNS IPv6 address `2001:4860:4860::8888` are all correct.
