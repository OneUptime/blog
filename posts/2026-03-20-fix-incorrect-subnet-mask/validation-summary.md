# Validation Summary: How to Fix an Incorrect Subnet Mask Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting and CIDR
- Linux networking (`ip`, `ifconfig`, `NetworkManager`, `systemd-networkd`, `ifupdown`)
- Windows networking (`ipconfig`, PowerShell NetTCPIP cmdlets, `netsh`)

## Sources Consulted
- NetworkManager Reference Manual: `nm-settings-nmcli` - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager Reference Manual: `nmcli` examples - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html
- systemd documentation: `systemd.network` - https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd documentation: `systemd.syntax` - https://www.freedesktop.org/software/systemd/man/251/systemd.syntax.html
- Microsoft Learn: `Get-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `New-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `Remove-NetIPAddress` - https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn: `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `about_Parsing` - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.5
- Debian Manpages: `interfaces(5)` - https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Linux manual page: `ip-address(8)` - https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux manual page: `ip-route(8)` - https://man7.org/linux/man-pages/man8/ip-route.8.html
- IETF RFC 4632: Classless Inter-domain Routing (CIDR) - https://www.ietf.org/ietf-ftp/rfc/rfc4632.txt.pdf
- IETF RFC 950: Internet Standard Subnetting Procedure - https://www.ietf.org/ietf-ftp/rfc/rfc950.txt.pdf

## Issues Found
- The Linux temporary route update used `ip route add default ...`, which can fail if a default route already exists. Updated it to `ip route replace default ...`, matching documented `ip route` behavior for change-or-add.
- The `systemd-networkd` example used an inline comment on the `Address=` line. Systemd configuration syntax documents comments as whole lines, so the comment was moved to its own line.
- The NetworkManager example set a static address and gateway without setting `ipv4.method manual`. Updated the example to set `ipv4.method manual`, which is the documented static IPv4 method.
- The `/etc/network/interfaces` example used an end-of-line comment on the `netmask` line. Debian `interfaces(5)` explicitly says end-of-line comments are not supported, so the inline comment was removed. I also added `auto eth0` so the snippet matches the post’s "permanent fix" framing.
- The PowerShell `New-NetIPAddress` example had a backtick line continuation followed by spaces and an inline comment on the same line. Microsoft’s `about_Parsing` documentation states that extra space after a backtick breaks line continuation, so the comment was moved to its own line.
- The `netsh` example used the older `interface ip` form and positional syntax rather than the current documented `interface ipv4 set address` syntax. Updated it to the current Microsoft Learn syntax.
- The tags listed `Window` instead of `Windows`. Corrected the platform tag.
- The Linux check comment said `ip -4 addr show` provided a netmask view. The command shows IPv4 addresses with prefix length (CIDR), so the comment was corrected.
- The Windows `Get-NetIPAddress` inspection example was broadened to all address families even though the surrounding text discusses IPv4 subnet masks. Updated it to filter with `-AddressFamily IPv4` so the displayed prefix lengths correspond to IPv4 masks.
- The gateway-mask and too-wide-mask explanations were slightly over-absolute. They were narrowed so they describe the actual forwarding behavior more precisely without changing the post’s structure.

## Review Notes
- The `ifconfig` example is clearly labeled as old-style. It remains technically usable on systems with `net-tools` installed, but `ip` is the current preferred Linux interface tooling.
- The `netsh` example is still valid to document because Microsoft continues to document `netsh interface`, but PowerShell NetTCPIP cmdlets are generally the more modern Windows automation interface.
