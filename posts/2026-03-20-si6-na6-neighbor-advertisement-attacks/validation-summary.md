# Validation Summary: How to Use the SI6 Networks na6 Tool for Neighbor Advertisement Attacks

## Status
validated

## Post Type
Tutorial / security testing guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- `na6`
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Neighbor Advertisement messages
- Linux `ip -6 neigh`
- Linux IPv6 forwarding sysctls
- SEND / Secure Neighbor Discovery

## Sources Consulted
- SI6 Networks IPv6 Toolkit official page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks IPv6 Toolkit upstream repository: https://github.com/fgont/ipv6toolkit
- Upstream `na6` manual: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/manuals/na6.1
- Upstream `na6` source option table: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/tools/na6.c
- Debian `na6(1)` manpage for packaged `ipv6toolkit`: https://manpages.debian.org/trixie/ipv6toolkit/na6.1.en.html
- Debian `ipv6toolkit` package listing: https://packages.debian.org/sid/net/ipv6toolkit
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 3971, SEcure Neighbor Discovery (SEND): https://datatracker.ietf.org/doc/html/rfc3971
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux `ip-neighbour(8)` manual: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- Arch Linux AUR package listing for `ipv6toolkit`: https://aur.archlinux.org/packages/ipv6toolkit

## Issues Found
- The Arch Linux installation command used `sudo pacman -S ipv6toolkit`, but `ipv6toolkit` is not in the official Arch repositories and is listed as an AUR package. Changed the line to note that Arch users should use the AUR package or build from source.
- Several examples used invalid IPv6 placeholders such as `2001:db8::gateway`, `2001:db8::host-a`, `2001:db8::victim`, and `2001:db8::target`. Replaced them with valid documentation-prefix IPv6 addresses.
- Several active-mode `na6` examples omitted the NA target address. The `na6` manual states active mode requires a destination address and a target address, so the examples now include `-t`.
- The post described `-s` as the address being claimed. In Neighbor Advertisements, the claimed/mapped address is the NA Target Address, so the option comments now distinguish `-s` from `-t`.
- The MITM examples had inline comments after line-continuation backslashes, which breaks shell parsing. Moved those comments to separate lines.
- The MITM and poisoning examples omitted a Target Link-Layer Address option, so they would not advertise the MAC address needed for cache poisoning. Added `-E 00:11:22:33:44:55` to the relevant examples.
- The post used non-existent `na6` options `--router-flag`, `--solicited-flag`, and `--tlla`. Replaced them with supported options: `--router`, `--solicited`, and `-E`.
- The forwarding command used `net.ipv6.conf.eth0.forwarding=1`; Linux documents `net.ipv6.conf.all.forwarding=1` as the global IPv6 forwarding switch, so the command now uses the global sysctl.
- The static NDP entry example used the invalid address `2001:db8::gateway`; replaced it with `2001:db8::1`.

## Review Notes
- I verified the edited shell snippets with `bash -n`.
- I extracted the Ubuntu/Debian `ipv6toolkit` package and checked each edited `na6` invocation against the packaged `na6` parser. The commands parse successfully and stop only at the expected non-root privilege check.
- The post remains a high-risk dual-use security testing guide, but it includes explicit authorization/lab-only warnings and is technically relevant.
