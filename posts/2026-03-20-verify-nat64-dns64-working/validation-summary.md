# Validation Summary: How to Verify NAT64 and DNS64 Are Working Correctly

## Status
validated

## Post Type
Tutorial / Operational verification guide

## Technologies Covered
- NAT64 (RFC 6146 — stateful IPv6-to-IPv4 translation)
- DNS64 (RFC 6147 — synthesis of AAAA from A records)
- TAYGA (userspace out-of-kernel NAT64 daemon, TUN-based)
- BIND / Unbound (as DNS64 resolvers)
- Well-Known Prefix `64:ff9b::/96` (RFC 6052)
- `ipv4only.arpa` (RFC 7050 / RFC 8880)
- Linux networking tooling: `dig`, `ip`, `iptables`, `ping`, `curl`, `systemctl`

## Sources Consulted
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (well-known prefix `64:ff9b::/96` and address embedding rules): https://www.rfc-editor.org/rfc/rfc6052
- RFC 6146 — Stateful NAT64: https://www.rfc-editor.org/rfc/rfc6146
- RFC 6147 — DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 7050 — Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis (`ipv4only.arpa`, A records 192.0.0.170 / 192.0.0.171): https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880 — Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880
- RFC 5952 — A Recommendation for IPv6 Address Text Representation (leading-zero suppression): https://www.rfc-editor.org/rfc/rfc5952
- TAYGA upstream project page: http://www.litech.org/tayga/
- Ubuntu `tayga(8)` manpage: https://manpages.ubuntu.com/manpages/bionic/man8/tayga.8.html
- Debian `tayga.conf(5)` manpage: https://manpages.debian.org/trixie/tayga/tayga.conf.5.en.html
- openthread/tayga community fork (command-line options): https://github.com/openthread/tayga

## Issues Found

1. **Non-existent TAYGA `--dump` option.** The post showed `sudo tayga --config /etc/tayga.conf --dump` as a way to inspect active mappings. TAYGA has no `--dump` command-line option (supported options are `--config`, `--user`, `--group`, `--chroot`, `--pidfile`, `--mktun`, `--rmtun`, `--nodetach`/`-d`, `--debug`, `--version`, `--help`). Dynamic mappings are persisted to the `dynamic.map` file inside the `data-dir` configured in `tayga.conf` (Debian/Ubuntu packages default `data-dir` to `/var/spool/tayga`). Replaced the command with `sudo cat /var/spool/tayga/dynamic.map` and a short explanation of where the file lives, and updated the Conclusion to match.

2. **Non-canonical IPv6 text for the synthesized address.** The expected synthesis for `ipv4only.arpa`'s 192.0.0.170 (0xC00000AA) was written as `64:ff9b::c000:0aa`. Each 16-bit group is 4 hex digits; the canonical compressed form per RFC 5952 drops leading zeros inside a group, giving `64:ff9b::c000:aa`. Fixed the expected output accordingly.

## Review Notes
- The Step 3 mapping `93.184.216.34 → 64:ff9b::5db8:d822` for `example.com` was historically accurate and the hex embedding is correct (93=0x5D, 184=0xB8, 216=0xD8, 34=0x22). IANA has since rotated `example.com` onto new address space (23.215.0.136 / 23.215.0.138 / 96.7.128.175 / 96.7.128.198), so the literal curl URL may not reach the current origin — but the example is presented as an illustration of the translation math rather than a live endpoint, so left unchanged.
- `8.8.8.8 → 64:ff9b::808:808` is correct (0x08080808 with RFC 5952 leading-zero suppression).
- `iptables -t nat -L POSTROUTING -n | grep 192.168.255` output shape (`MASQUERADE  all  192.168.255.0/24`) is a simplified depiction; the real output also includes protocol/destination columns, but this is fine for a grep-style expected match.
- On modern distributions `iptables` is often provided by `nftables` via `iptables-nft`. The commands still work but users exclusively on `nft` may prefer native nft rules; not flagged as an error.
- The MTU guidance (1480 or lower for the `nat64` TUN) is a reasonable pragmatic default to avoid PMTUD-related black holes across translation, though NAT64 itself does not add per-packet overhead in the wire sense — IPv6 vs IPv4 header sizes differ, and TAYGA handles fragmentation / ICMPv6 PTB, so 1500 is typically also workable.
