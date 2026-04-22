# Validation Summary: How to Use the SI6 Networks scan6 Tool for IPv6 Reconnaissance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- scan6
- IPv6 host discovery and reconnaissance
- Neighbor Discovery Protocol and IPv6 multicast
- Nmap IPv6 scanning
- Linux package installation and shell commands

## Sources Consulted
- SI6 Networks IPv6 Toolkit page: https://www.si6networks.com/research/tools/ipv6toolkit/
- Upstream ipv6toolkit repository and README: https://github.com/fgont/ipv6toolkit
- Upstream scan6 manual/source: https://github.com/fgont/ipv6toolkit/tree/master/manuals and https://github.com/fgont/ipv6toolkit/tree/master/tools
- Debian ipv6toolkit package/manpage: https://packages.debian.org/sid/net/ipv6toolkit and https://manpages.debian.org/testing/ipv6toolkit/scan6.1.en.html
- Arch Linux AUR package page: https://aur.archlinux.org/packages/ipv6toolkit
- Nmap IPv6 and host discovery documentation: https://nmap.org/book/man-misc-options.html and https://nmap.org/book/man-host-discovery.html
- Nmap NSE discovery script documentation: https://nmap.org/nsedoc/categories/discovery.html
- RFC 7707, Network Reconnaissance in IPv6 Networks: https://www.rfc-editor.org/rfc/rfc7707
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The Arch Linux install command used `sudo pacman -S ipv6toolkit`, but the package is in the AUR rather than the official pacman repositories. Updated the example to clone the AUR package and run `makepkg -si`.
- The source build example used `make`; upstream documents `make all`. Updated the command.
- The basic remote prefix scan used `-l` and described EUI-64 probing. In scan6, `-l` is loop mode, not EUI-64 targeting. Updated the example to use `--tgt-low-byte`.
- The local-link example claimed that `-L -d PREFIX` limits discovery to a prefix, but the local scan path discovers local-link addresses rather than applying that prefix as a local filter. Updated the example to show the documented `-P global` output filter.
- Several address-pattern examples used unsupported or incomplete flags: `--tgt-ipv4-mapped`, `--tgt-ipv4-embedded` without `--ipv4-host`, and `--tgt-word`. Updated them to documented scan6 options: `--tgt-ipv4 ipv4-32`, `--tgt-ipv4 ipv4-64`, `--ipv4-host`, and `--tgt-port`.
- The target-list example used `-l targets.txt`; `-l` is loop mode. Updated it to `-m targets.txt`, the documented prefixes-file option for IPv6 addresses and prefixes.
- The rate-limit example used local scan mode and a unitless value. Updated it to a remote scan example with `--rate-limit 100pps`, matching scan6's `Xpps` / `Xbps` syntax.
- The retransmission default was listed as 1, but scan6 defaults to 0 retransmissions. Updated the text.
- The retransmission and timeout examples targeted a remote address, but the current scan6 source applies those timing fields to local probe handling. Updated the examples to use local scan mode.
- The sample `-e` output used parentheses, but scan6 documents and implements `IPV6ADDRESS @ LINKADDRESS`. Updated the sample output.
- The MAC-address interpretation claimed that MAC output can determine whether an address is random or manually configured. Updated the wording to say it can check for an EUI-64 match, while non-matching addresses may be temporary/random or manually configured.
- The Nmap comparison table said EUI-64 and IPv4-derived target generation are unavailable in Nmap and that scan6 has no port-scanning support. Updated the table to reflect Nmap NSE target-generation scripts and scan6's limited probing/port-scan options.
- The workflow used a fragile IPv6 regex for extracting addresses from scan6 output. Updated it to extract the first field from scan6 output.

## Review Notes
No live network scan was run because `scan6` was not installed locally and accurate runtime validation would require an authorized IPv6 lab segment. Commands and claims were checked against upstream source/manual text, packaged manpages, Nmap documentation, and relevant RFCs.
