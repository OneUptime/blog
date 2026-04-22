# Validation Summary: How to Use the SI6 Networks ra6 Tool for Router Advertisement Attacks

## Status
validated

## Post Type
Tutorial / security testing guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- `ra6`
- IPv6 Router Advertisements
- ICMPv6 Neighbor Discovery
- SLAAC
- RA Guard
- RDNSS
- Linux `ip` and `ip6tables`

## Sources Consulted
- SI6 Networks IPv6 Toolkit page: https://www.si6networks.com/research/tools/ipv6toolkit/
- Upstream `ra6` manual page: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/manuals/ra6.1
- Upstream `ra6` source code and option parser: https://github.com/fgont/ipv6toolkit/blob/master/tools/ra6.c
- Debian `ra6(1)` man page for the packaged `ipv6toolkit`: https://manpages.debian.org/testing/ipv6toolkit/ra6.1.en.html
- Ubuntu/Debian `ipv6toolkit` package metadata from local `apt-cache show ipv6toolkit`
- Arch Linux AUR package page for `ipv6toolkit`: https://aur.archlinux.org/packages/ipv6toolkit
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 6105, IPv6 Router Advertisement Guard: https://www.rfc-editor.org/rfc/rfc6105
- RFC 7113, RA-Guard implementation advice: https://www.rfc-editor.org/rfc/rfc7113
- RFC 6980, IPv6 fragmentation with Neighbor Discovery: https://www.rfc-editor.org/rfc/rfc6980
- RFC 8106, IPv6 RA DNS options: https://www.rfc-editor.org/rfc/rfc8106
- Local `ip6tables -p icmpv6 -h` output for the `router-advertisement` ICMPv6 type name
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- The Arch Linux install command used `sudo pacman -S ipv6toolkit`, but `ipv6toolkit` is in the AUR rather than the official Arch repositories. Changed it to an AUR install example.
- Several `ra6` examples used active-mode commands without a destination address. Upstream `ra6` sends an unsolicited RA only when an IPv6 destination or Ethernet destination is specified, so the examples now include `-d ff02::1` where they are intended to send immediately.
- The unicast target example used the invalid placeholder IPv6 address `fe80::target` and did not specify an Ethernet destination. Replaced it with a syntactically valid link-local address and a placeholder Ethernet destination using `-D`.
- Replaced invalid long options `--router-lifetime`, `--cur-hop-limit`, `--rdnss`, `--prefix-opt-a`, `--prefix-opt-l`, `--prefix-opt-valid`, `--prefix-opt-preferred`, and `--hbh-opt` with the documented `ra6` options and argument formats.
- Removed the DNSSL command because current `ra6` supports RDNSS with `--rdnss-opt` / `-N`, but does not document or implement a DNSSL option.
- Corrected Prefix Information option examples to use the documented `-P prefix/length#flags#valid#preferred` syntax.
- Changed `--sleep 0` to `--sleep 1` because `ra6` rejects a zero-second sleep interval.
- Changed the "maximum prefix count per RA" wording because the example showed multiple prefixes, not the maximum supported count.
- Added required argument values to `--frag-hdr` and `--hbh-opt-hdr`; both options require sizes in the documented CLI.

## Review Notes
- The fragmentation RA Guard test is syntactically valid for `ra6`, but modern compliant nodes should ignore fragmented Neighbor Discovery packets under RFC 6980. The example is still useful for testing older or non-compliant RA Guard behavior.
- The host-based `ip6tables` example uses a valid ICMPv6 type name, but dropping all incoming RAs on a host will also block legitimate IPv6 autoconfiguration and default-router discovery.
