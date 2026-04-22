# Validation Summary: How to Use the SI6 Networks frag6 Tool for Fragmentation Attacks

## Status
validated

## Post Type
Security testing tutorial / guide

## Technologies Covered
- SI6 Networks IPv6 Toolkit
- frag6
- tcp6
- IPv6 Fragment Header and extension headers
- Linux IPv6 fragment reassembly sysctls
- ip6tables IPv6 extension-header matching

## Sources Consulted
- SI6 Networks IPv6 Toolkit official page: https://www.si6networks.com/research/tools/ipv6toolkit/
- SI6 Networks upstream `frag6` manual: https://raw.githubusercontent.com/fgont/ipv6toolkit/master/manuals/frag6.1
- SI6 Networks upstream `frag6` source/help output: https://github.com/fgont/ipv6toolkit/blob/master/tools/frag6.c
- Debian/Ubuntu `ipv6toolkit` package help output from `ipv6toolkit` 2.0+ds.1-2build2
- Arch package search and AUR package page: https://archlinux.org/packages/?q=ipv6toolkit and https://aur.archlinux.org/packages/ipv6toolkit
- RFC 8200, IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 5722, Handling of Overlapping IPv6 Fragments: https://www.rfc-editor.org/rfc/rfc5722.html
- RFC 7112, Implications of Oversized IPv6 Header Chains: https://www.rfc-editor.org/rfc/rfc7112.html
- RFC 6946, Processing of IPv6 Atomic Fragments: https://www.rfc-editor.org/rfc/rfc6946.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- iptables-extensions manual for `frag` and `ipv6header` matches: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The Arch install command used `sudo pacman -S ipv6toolkit`, but `ipv6toolkit` is not in the official Arch package repositories. Changed it to an AUR package note.
- The examples used `2001:db8::target`, which is not a valid IPv6 literal. Replaced it with `2001:db8::1`.
- Several `frag6` examples used unsupported options: `--overlap`, `--overlap-data`, `--overlap-type`, `--data`, `--proto`, `--dport`, `--frag-id-shuffle`, `--no-last-frag`, and `--loop-count`. Replaced them with supported `frag6` options such as `--frag-type`, `--frag-reass-policy`, `--frag-id-policy`, `--flood-frags`, `--sleep`, and `--no-responses`.
- The overlap section implied modern systems choose different overlap policies. Updated it to state that current IPv6 nodes must discard overlapping fragments, while `frag6` can test whether a target follows that behavior.
- The reassembly DoS shell example had invalid line continuations with inline comments after backslashes and used unsupported flags. Replaced it with a valid bounded-batch `frag6` flood loop.
- The TCP firewall example incorrectly used `frag6` for TCP/port testing. `frag6` sends ICMPv6 Echo Request fragment probes, so the TCP example now uses `tcp6 --dst-port ... --frag-hdr ...`.
- The `ip6tables -m frag --fragmore` defense did not block all fragmented IPv6 traffic; it only matched fragments with the More Fragments flag set. Replaced it with `-m ipv6header --header frag --soft` to match packets carrying a Fragment header.
- The fragment offset description omitted the 8-octet-unit semantics. Updated the description.
- The broad claim that Linux drops packets with fragment and routing headers together was replaced with explicit firewall-policy guidance.

## Review Notes
The commands were syntax-checked against the Debian/Ubuntu `ipv6toolkit` package binary and upstream help output up to the root-privilege check; no live packet tests were run. The example address uses the documentation prefix and must be replaced with an authorized lab target.
