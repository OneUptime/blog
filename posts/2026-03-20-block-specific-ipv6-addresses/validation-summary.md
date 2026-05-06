# Validation Summary: How to Block Specific IPv6 Addresses and Prefixes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefixes
- ip6tables
- ipset
- nftables
- systemd `journalctl`
- Bash shell scripting

## Sources Consulted
- netfilter `nft` man page: https://netfilter.org/projects/nftables/manpage.html
- nftables wiki, Sets: https://wiki.nftables.org/wiki-nftables/index.php/Sets
- nftables wiki, Element timeouts: https://wiki.nftables.org/wiki-nftables/index.php/Element_timeouts
- nftables wiki, Updating sets from the packet path: https://wiki.nftables.org/wiki-nftables/index.php/Updating_sets_from_the_packet_path
- iptables/ip6tables man page: https://ipset.netfilter.org/iptables.man.html
- iptables extensions man page (`set` match): https://ipset.netfilter.org/iptables-extensions.man.html
- ipset man page: https://ipset.netfilter.org/ipset.man.html
- systemd `journalctl` man page: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd time parsing reference: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, Documentation Prefix for IPv6: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- Several example IPv6 literals were invalid because hextets such as `attacker`, `malicious`, `scanner`, `asn1`, and `new-bad` are not hexadecimal. I replaced them with valid IPv6 examples under the RFC 3849 documentation prefix.
- One example prefix used `2001:db8:bad2::/32`, which did not represent a distinct /32 network because the extra hextet bits were outside the prefix length. I replaced it with a network-aligned prefix example.
- The nftables examples used identifiers with hyphens (`bad-addrs`, `dynamic-block`, `temp-block`). Per the `nft` syntax rules, unquoted identifiers cannot contain hyphens, so I renamed them to underscore-based identifiers.
- The automated log parser used `grep -oP 'from \K[2f][0-9a-f:]+'`, which only matched IPv6 addresses starting with `2` or `f` and could miss valid addresses. I replaced it with a regex that requires a colon and matches general IPv6-looking literals.
- The `BLOCK_TIME` shell variable was declared but unused. I updated the `nft add element` command to apply the per-element timeout explicitly.
- The “check if specific address is in nftables set” example used `grep` on `nft list set`, which is not the correct membership query for large or interval sets. I replaced it with `nft get element`, which is the documented lookup command.

## Review Notes
- `journalctl -u ssh` is distro-specific; some Linux distributions log SSH under `sshd.service`.
- The log parser still assumes GNU `grep -P` support.
- On modern Linux distributions, `ip6tables` often uses the `nf_tables` backend even though nftables is the native interface.
