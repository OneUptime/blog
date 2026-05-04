# Validation Summary: How to Configure NTP Authentication over IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- chrony (chronyd, chronyc) — symmetric key auth and NTS
- ntpd (reference ntp.org) — symmetric key auth
- NTPsec — NTS support
- Network Time Security (NTS), RFC 8915
- IPv6 NTP transport
- TLS / Let's Encrypt certificates for NTS-KE
- Public NTS providers (Cloudflare, Netnod)

## Sources Consulted
- chrony.conf(5) manual — https://chrony-project.org/doc/4.5/chrony.conf.html (keyfile, server `key`/`require`, `bindaddress`, `ntsservercert`, `ntsserverkey`, `ntsdumpdir`, `allow`)
- RFC 8915 — Network Time Security for NTP (NTS-KE port 4460)
- ntp.org reference ntpd 4.2.8 documentation — https://www.ntp.org/documentation/4.2.8-series/authentic/ and /decode/ (tally codes, no NTS)
- NTPsec NTS Quick Start — https://docs.ntpsec.org/latest/NTS-QuickStart.html (confirms NTPsec, not reference ntpd, supports NTS)
- Netnod NTS instructions — https://www.netnod.se/netnod-time/how-to-use-nts (correct hostnames are `<location>.nts.netnod.se`)
- ntppool.org documentation — IPv6 zone is `2.pool.ntp.org`; no `ipv6.pool.ntp.org` exists
- RFC 3849 — IPv6 documentation prefix `2001:db8::/32`

## Issues Found

1. **Broken shell redirection with sudo.** `sudo cat > /etc/chrony.keys << 'EOF'` does not work because the shell performs `>` redirection in the unprivileged parent shell before sudo runs. Replaced with `sudo tee /etc/chrony.keys > /dev/null << 'EOF'`.

2. **Invalid IPv6 address placeholder.** `server 2001:db8::upstream-ntp` is not a valid IPv6 address (the label contains non-hex characters). Replaced with `2001:db8::100`.

3. **Redundant duplicate `server` lines for the same upstream.** The client config had `server 2001:db8::1 iburst key 1` followed by `server 2001:db8::1 iburst key 1 require`. Per chrony semantics this is two separate sources to the same address. Collapsed to a single line `server 2001:db8::1 iburst key 1 require` and clarified what `require` means.

4. **Incorrect claim about NTS support in reference ntpd.** The post stated "chrony 4.0+ and ntpd 4.2.8+ support NTS." The ntp.org reference `ntpd` does not implement NTS — only chrony 4.0+ and NTPsec do. Reworded to "chrony 4.0+ and NTPsec support NTS (the reference ntp.org `ntpd` does not)".

5. **Non-existent NTP pool hostname.** `pool ipv6.pool.ntp.org` is not a valid NTP Pool zone. The IPv6-capable zone is `2.pool.ntp.org`. Replaced and added a brief comment.

6. **Wrong Netnod NTS hostnames.** `nts.sth1.ntp.se` and `nts.netnod.se` are not the correct names. Per Netnod documentation the format is `<site>.nts.netnod.se` (e.g. `sth1.nts.netnod.se`, `gbg1.nts.netnod.se`). Replaced with two valid hostnames.

7. **Incorrect ntpq tally-code claim.** The post claimed authenticated peers show an `a` flag in the tally-code column of `ntpq -p`. The tally codes are ` `, `x`, `.`, `-`, `+`, `#`, `*`, `o` only — no `a`. Authentication status is exposed via `ntpq -c associations` (auth column) or `readvar`/flash codes. Replaced with the correct command and column reference.

## Review Notes
- The chrony `allow 2001:db8::/32` directive is syntactically valid but a /32 prefix matches the entire IPv6 documentation block — in real deployments operators should narrow this to their actual client subnet. Left as-is since the example uses RFC 3849 documentation addresses throughout.
- The chrony.keys example uses unprefixed key values, which chrony interprets as ASCII passwords (not hex bytes). This still works but operators wanting raw entropy should prefix values with `HEX:`. Left unchanged since the format is technically valid.
- `requestkey` / `controlkey` in `/etc/ntp.conf` are legacy reference-ntpd directives controlling mode-7 (ntpdc, deprecated/removed in many builds) and mode-6 (ntpq) authentication. They are still accepted by ntpd 4.2.8 and were left in place.
- The chown group `chrony` may be `_chrony` on Debian/Ubuntu; left as `chrony` as it matches the upstream default and most RPM-based distros.
