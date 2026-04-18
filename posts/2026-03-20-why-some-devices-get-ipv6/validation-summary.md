# Validation Summary: Why Some Devices Get IPv6 and Others Don't

## Status
validated

## Post Type
Troubleshooting guide / reference

## Technologies Covered
- IPv6 (SLAAC, Router Advertisements, Neighbor Discovery)
- DHCPv6 (stateful IA_NA, stateless, IA_PD)
- Linux networking tools (`sysctl`, `ip`, `tcpdump`, `ndisc6`/`rdisc6`, `ip6tables`)
- Windows PowerShell networking cmdlets (`Get-NetAdapter`, `Get-NetAdapterBinding`, `Get-NetIPAddress`, `Set-NetAdapterBinding`, `netsh int ipv6 reset`)
- macOS networking utilities (`ifconfig`, `networksetup`, `ndp`)
- Android IPv6 stack behavior
- radvd configuration
- WireGuard and OpenVPN IPv6 configuration

## Sources Consulted
- [RFC 4861 - Neighbor Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc4861)
- [RFC 4862 - IPv6 Stateless Address Autoconfiguration](https://www.rfc-editor.org/rfc/rfc4862)
- [Google Issue Tracker 36949085 - DHCPv6 (RFC 3315) support, marked Won't Fix](https://issuetracker.google.com/issues/36949085)
- [Android Developers Blog: Simplifying advanced networking with DHCPv6 Prefix Delegation (Sep 2025)](https://android-developers.googleblog.com/2025/09/simplifying-advanced-networking-with.html)
- [ipSpace.net: Android Phones Might Ask for /64 Delegated Prefix](https://blog.ipspace.net/2025/09/android-dhcpv6-prefix-delegation/)
- [nullzero.co.uk: Android does not support DHCPv6 and Google 'Won't Fix' that](https://www.nullzero.co.uk/android-does-not-support-dhcpv6-and-google-wont-fix-that/)
- [macOS/FreeBSD ndp(8) man page](https://man.freebsd.org/ndp(8))
- [radvd.conf(5) man page](https://linux.die.net/man/5/radvd.conf)
- [Microsoft: Guidance for configuring IPv6 in Windows (DisabledComponents)](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows)
- [ndisc6/rdisc6 documentation](https://www.remlab.net/ndisc6/)

## Issues Found
1. **Incorrect claim that "Android 14+ supports DHCPv6 stateful".** Android has never supported stateful DHCPv6 (IA_NA) on any version. Google formally marked the long-standing feature request (issue tracker 36949085) as "Won't Fix (Intended Behavior)". What Android 14+ added (via later updates announced by Google in 2025) is DHCPv6 **Prefix Delegation (IA_PD)** for tethering, which is a different RFC 8415 feature. Rewrote the Android section and the summary/conclusion to state that no Android version implements DHCPv6 IA_NA, and clarified that IA_PD (not IA_NA) is the recent addition. Also updated the numbered list item 8.
2. **Inaccurate comment on `ndp -r` on macOS.** The comment said the command shows "routing table with IPv6 routes"; the `-r` flag to `ndp(8)` actually prints the default router list learned via Neighbor Discovery. Updated the inline comment to reflect the correct behavior.

## Review Notes
- The `tcpdump` filter `'icmp6 and ip6[40] == 134'` works when there are no IPv6 extension headers between the IPv6 fixed header and the ICMPv6 header (the typical case for Router Advertisements on a LAN). An alternative that is robust to extension headers is `'icmp6[icmp6type] == icmp6-router-advert'`, but the filter shown is widely used and correct for standard setups — left as-is.
- The "OpenWrt example" labels a `radvd.conf` snippet; OpenWrt's default IPv6 RA/DHCPv6 daemon is `odhcpd`, though radvd is available as an optional package. The syntax shown is valid radvd syntax, so this is defensible and was left unchanged.
- `ping6` is the legacy BusyBox/iputils command; modern iputils installs a unified `ping` that accepts `-6`. On most current Linux distributions `ping6` remains available as a compatibility symlink, so the diagnostic script will still work; on very new or minimal systems users may need to substitute `ping -6`.
- The Windows `DisabledComponents` registry value is documented by Microsoft: `0` means all IPv6 components enabled, `0xFF` disables all — correctly described in the post.
