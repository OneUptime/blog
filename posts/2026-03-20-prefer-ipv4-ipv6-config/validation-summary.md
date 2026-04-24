# Validation Summary: How to Configure IPv4 or IPv6 Preference on Dual-Stack Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 and IPv6 dual-stack networking
- RFC 6724 address selection policy tables
- glibc `gai.conf`
- Linux `sysctl` and `ip addrlabel`
- Windows `netsh`, registry, and NetAdapter PowerShell cmdlets
- macOS network service TCP/IP configuration
- Python `socket.getaddrinfo()`
- `curl`, `wget`, and OpenSSH `ssh`
- Java networking system properties

## Sources Consulted
- RFC 6724: https://www.rfc-editor.org/rfc/rfc6724.html
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, Guidance for configuring IPv6 in Windows for advanced users: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn, `New-ItemProperty`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-itemproperty?view=powershell-7.6
- Microsoft Learn, `Set-ItemProperty`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.6
- Microsoft Learn, `Disable-NetAdapterBinding`: https://learn.microsoft.com/en-us/powershell/module/netadapter/disable-netadapterbinding?view=windowsserver2025-ps
- Apple Support, Change TCP/IP settings on Mac: https://support.apple.com/guide/mac-help/change-tcpip-settings-on-mac-mh14129/mac
- Apple Developer, `getaddrinfo(3)`: https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/getaddrinfo.3.html
- Python documentation, `socket`: https://docs.python.org/3/library/socket.html
- Oracle Java documentation, Networking Properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html
- Local Linux man page: `gai.conf(5)`
- Local Linux man page: `ip-addrlabel(8)`
- Local CLI help output: `curl --help all`, `wget --help`, OpenSSH `ssh` usage output

## Issues Found
- The post said macOS uses `/etc/gai.conf` in the same way as Linux. I replaced that claim with Apple-documented per-service TCP/IP settings because `/etc/gai.conf` is a glibc-specific mechanism and is not documented by Apple as the way to control address preference on macOS.
- The Linux `gai.conf` examples overrode the default table without preserving the full table. I added the missing RFC 6724 label and precedence entries so the example is a valid full override instead of a partial one.
- The Linux note said the `gai.conf` change takes effect immediately with no restart required. I corrected that to note that new processes pick it up automatically, but long-running processes may need restart because `gai.conf` reload is off by default.
- The `ip addrlabel` example flushed the kernel label table and implied it could change destination precedence. I replaced it with an accurate explanation that `addrlabel` affects source-address label matching only and does not replace `gai.conf` for destination ordering.
- The Windows registry example used `Set-ItemProperty -Type`, which is not a valid `Set-ItemProperty` parameter. I replaced it with `New-ItemProperty -PropertyType DWord -Force`.
- The Windows restore section only removed the custom `netsh` prefix policy. I added the registry reset command so the documented restore path also undoes `DisabledComponents=0x20`.
- The per-application snippet put raw Python statements inside a `bash` code fence. I converted those lines to `python3 -c` commands so the examples are executable as written.
- The Java section used imprecise wording about preferring "IPv6 DNS results" and included a vague Spring Boot note without a valid configuration example. I tightened the wording and removed the unsupported note.
- The `Window` tag was corrected to `Windows`.

## Review Notes
- `/etc/gai.conf` applies to glibc-based Linux systems; musl-based systems may not use it.
- Microsoft's current Windows guidance still references RFC 3484 terminology, but the documented precedence comparison used here (`::/0` at 40 and `::ffff:0:0/96` at 35 by default) remains consistent with the post's core explanation.
- The post includes interface-level IPv6 disable examples on Linux and Windows, but vendor guidance generally prefers policy-table changes over disabling IPv6 unless there is a specific operational reason.
