# Validation Summary: How to Test MTU Size with Ping and the DF Flag

## Status
validated

## Post Type
Tutorial / networking troubleshooting guide

## Technologies Covered
- IPv4 MTU and Path MTU Discovery
- ICMP echo requests and the Don't Fragment flag
- Linux iputils `ping`
- macOS/BSD `ping`
- Windows `ping`
- WireGuard tunnel MTU considerations
- Bash and PowerShell command snippets

## Sources Consulted
- Linux iputils `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Apple `ping(8)` manual source for macOS network commands: https://raw.githubusercontent.com/apple-oss-distributions/network_cmds/main/ping.tproj/ping.8
- Microsoft Learn `ping` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- WireGuard `wg-quick(8)` manual: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- WireGuard `wg-quick` Linux MTU selection source: https://git.zx2c4.com/wireguard-tools/tree/src/wg-quick/linux.bash
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The post described the DF/ping technique and 28-byte header calculation too generally. I clarified that the DF flag and `payload + 28` math apply to IPv4 without IP options.
- The binary search snippet used `HIGH=8972`, which can return 8999 instead of 9000 on a path that supports a 9000-byte MTU. I changed it to `HIGH=8973`, one byte above the 9000-byte MTU payload ceiling.
- The Windows examples used non-documented dash-style switches. I changed them to Microsoft-documented `/f`, `/l`, and `/n` switches, and tightened the PowerShell success match to `bytes=$size` so unreachable replies are not mistaken for successful echo replies.
- The WireGuard example mixed tunnel overhead with ICMP/IP header math and included an incorrect expression. I corrected the comments to distinguish `wg-quick`'s common 80-byte MTU reduction from the `1420 - 28 = 1392` ICMP payload test.
- The MTU black-hole wording treated a timeout as definitive proof. I changed it to "possible" / "may indicate" because packet loss, filtering, or host behavior can also cause no response.
- The automation snippet called a coarse fallback probe list the "actual MTU." I changed the wording and output to report that a host supports at least the tested MTU.
- Fixed the metadata tag typo from `Window` to `Windows`.

## Review Notes
The corrected post remains focused on IPv4. IPv6 path MTU testing has different details because IPv6 routers do not fragment packets and there is no IPv4-style DF bit.
