# Validation Summary: How to Configure Remote Desktop over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Windows Remote Desktop (`mstsc`)
- Windows Defender Firewall / PowerShell NetSecurity cmdlets
- IPv6
- FreeRDP / `xfreerdp`
- `xrdp`
- UFW
- `ip6tables`
- `netfilter-persistent`

## Sources Consulted
- Microsoft Learn: `mstsc` command syntax - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/mstsc
- Microsoft Learn: `New-NetFirewallRule` - https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2019-ps
- Microsoft Learn: `Set-NetFirewallRule` - https://learn.microsoft.com/en-us/powershell/module/netsecurity/set-netfirewallrule?view=windowsserver2022-ps
- Microsoft Learn: Remote Desktop firewall troubleshooting example - https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/remote-desktop-cannot-connect-remote-computer
- Microsoft Learn: IP Version 6 Support - https://learn.microsoft.com/en-us/windows/win32/wininet/ip-version-6-support
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986
- xrdp official repository - https://github.com/neutrinolabs/xrdp
- xrdp official `xrdp.ini` template - https://github.com/neutrinolabs/xrdp/blob/devel/xrdp/xrdp.ini.in
- Ubuntu `xrdp.ini(5)` man page - https://manpages.ubuntu.com/manpages/questing/man5/xrdp.ini.5.html
- Debian `xfreerdp(1)` man page - https://manpages.debian.org/xfreerdp
- Ubuntu `ufw(8)` man page - https://manpages.ubuntu.com/manpages/focal/man8/ufw.8.html
- Ubuntu `ip6tables-save(8)` man page - https://manpages.ubuntu.com/manpages/focal/man8/ip6tables-save.8.html
- Ubuntu `netfilter-persistent(8)` man page - https://manpages.ubuntu.com/manpages/xenial/man8/netfilter-persistent.8.html

## Issues Found
- The Windows Firewall section used `New-NetFirewallRule -RemoteAddress "IPv6"`, but Microsoft documents `RemoteAddress` as accepting specific keywords such as `Any` and `LocalSubnet6`; `"IPv6"` is not a documented keyword. I replaced this with a safer approach that enables the built-in `Remote Desktop` firewall rule group and resets its remote-address scope to `Any`.
- The Windows Firewall section implied the built-in Remote Desktop rule might only allow IPv4 by default. I corrected this to reflect that the built-in rule group normally applies to both IPv4 and IPv6 unless it has been disabled or manually narrowed.
- The `xfreerdp` example used `/cert-ignore`. Current FreeRDP documentation uses `/cert:ignore`, and older slash forms are deprecated. I updated the command to the current syntax.
- The `xrdp` section used `address=::`, which is not how current `xrdp` releases document listener configuration. Current documentation uses the `port` setting for listener configuration, so I corrected the snippet to the supported form and clarified the expected `ss` output.
- The Linux firewall section implied that `ip6tables-save | tee /etc/ip6tables.rules` makes rules persistent by itself. `ip6tables-save` only writes out the current ruleset; on Ubuntu/Debian, `netfilter-persistent save` is the persistence step. I corrected the example and added the required package installation.
- The certificate troubleshooting note only mentioned hostname validation even though the article connects by literal IPv6 address. I updated it to state that the certificate must match the hostname or IP literal actually used for the connection.
- Corrected the `Window` tag to `Windows`.

## Review Notes
- The post remains technically valid as a TCP-focused guide. RDP can also use UDP 3389 for performance on some Windows deployments, but TCP 3389 is sufficient for basic connectivity and matches the article's scope.
- Using `DisplayGroup "Remote Desktop"` is more robust than targeting a localized rule display name directly.
- On Linux, IPv6 handling for all-interface listeners can vary slightly by distribution and socket-stack behavior, so the `ss` verification step is still the right final check.
