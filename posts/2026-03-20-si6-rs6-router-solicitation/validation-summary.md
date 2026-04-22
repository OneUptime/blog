# Validation Summary: How to Use the SI6 Networks rs6 Tool for Router Solicitation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- rs6
- IPv6 Neighbor Discovery Protocol
- ICMPv6 Router Solicitation and Router Advertisement
- tcpdump
- rdisc6 / ndisc6
- Nmap NSE ipv6-ra-flood

## Sources Consulted
- SI6 Networks IPv6 Toolkit project page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks ipv6toolkit v2.2 rs6 source and manual: https://github.com/fgont/ipv6toolkit
- Debian rs6(1) man page for ipv6toolkit: https://manpages.debian.org/testing/ipv6toolkit/rs6.1.en.html
- Kali ipv6toolkit package/help output: https://www.kali.org/tools/ipv6toolkit/
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- ndisc6/rdisc6 man page: https://manpages.debian.org/buster/ndisc6/rdisc6.8.en.html
- Nmap ipv6-ra-flood NSE documentation: https://nmap.org/nsedoc/scripts/ipv6-ra-flood.html
- Arch User Repository package page for ipv6toolkit: https://aur.archlinux.org/packages/ipv6toolkit

## Issues Found
- The Arch Linux install command used `sudo pacman -S ipv6toolkit`, but `ipv6toolkit` is available from the AUR rather than the official pacman repositories. Replaced it with the AUR build flow using `git clone` and `makepkg -si`.
- The example destination `fe80::router` was not a valid IPv6 address. Replaced it with `fe80::1`.
- The SLLA examples used unsupported `rs6 --slla` syntax. Replaced them with documented `rs6` options: `-e` to add the source link-layer address option and `-E` to set the option contents.
- The rate-limit examples used unsupported options (`--loop-count`) and an invalid zero sleep interval. Replaced them with `-F 100`, the documented flood-sources option, and quoted the `tcpdump` BPF filter.
- The multiple-source flooding example used unsupported `--src-addr-shuffle`, `--loop-count`, and `--sleep 0` options, plus an invalid inline comment after a line continuation. Replaced it with `-e -F 1000`.
- The SLAAC trigger example used default `rs6` behavior, which sends from a randomized link-local source by default. Changed it to use `-s ::` so the router response is multicast rather than tied to a forged unicast source.
- The Nmap comparison implied `ipv6-ra-flood` was an RS testing tool. Clarified that the script sends Router Advertisements, not Router Solicitations.
- The defensive rate-limit note gave a vague 3-10 second range. Replaced it with the RFC 4861 multicast RA limit of no more than one every 3 seconds.

## Review Notes
The `rs6` v2.2 source and packaged help differ slightly from the Debian-rendered long-option names, so the corrected examples prefer documented short options where possible. The `tcpdump` filter assumes no IPv6 extension headers before ICMPv6; it is acceptable for the simple capture examples in this post.
