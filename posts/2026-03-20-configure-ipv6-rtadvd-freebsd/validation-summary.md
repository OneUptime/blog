# Validation Summary: How to Configure IPv6 Router Advertisements with rtadvd on FreeBSD

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- FreeBSD `rtadvd(8)` (Router Advertisement Daemon)
- `rtadvd.conf(5)` configuration file (getcap/termcap-style syntax)
- IPv6 SLAAC (Stateless Address Autoconfiguration)
- ICMPv6 Router Advertisement (RA, ICMPv6 type 134)
- RDNSS / DNSSL options (RFC 8106)
- DHCPv6 M and O flag interaction
- FreeBSD `service(8)` and `rc.conf(5)`
- `tcpdump`, `pgrep`, `kill` (signal delivery)

## Sources Consulted
- FreeBSD `rtadvd.conf(5)` man page: https://man.freebsd.org/cgi/man.cgi?query=rtadvd.conf&sektion=5
- FreeBSD `rtadvd(8)` man page: https://man.freebsd.org/cgi/man.cgi?query=rtadvd&sektion=8
- FreeBSD source: `usr.sbin/rtadvd/config.c` (https://cgit.freebsd.org/src/tree/usr.sbin/rtadvd/config.c)
- FreeBSD source: `usr.sbin/rtadvd/rtadvd.conf.5`
- RFC 4861 (Neighbor Discovery for IPv6) — RA message structure
- RFC 8106 (IPv6 Router Advertisement Options for DNS Configuration) — RDNSS/DNSSL
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — `2001:db8::/32`

## Issues Found

Multiple technical errors required correction. The post conflated `radvd` (Linux) configuration syntax with FreeBSD `rtadvd.conf` syntax in several places.

1. **Invalid IPv6 example address `2001:db8:lan::`** — `lan` is not a valid hexadecimal group, so the address would fail to parse. Replaced with `2001:db8:1::` consistently across all examples (and in the "Multiple Prefixes" section also adjusted `fd00:db8:lan::` → `fd00:db8:1::`).

2. **RFC variable names used as if they were rtadvd.conf field names.** rtadvd.conf uses short termcap-style capability names, not the RFC `Adv*` variable names. Replaced:
   - `AdvDefaultLifetime#1800` — removed (the existing `rltime#1800` already sets this; the two were duplicates)
   - `AdvReachableTime#0` → `rtime#0`
   - `AdvRetransTimer#0` → `retrans#0`
   - `AdvCurHopLimit#64` → `chlim#64`
   - `AdvLinkMTU#1500` — removed (duplicate of `mtu#1500`)
   The "Fields Explained" section was updated correspondingly.

3. **`mflag#0` and `oflag#1` are not valid rtadvd.conf capabilities.** The M and O flags are encoded together in a single `raflags` string (or numeric bitmask). Replaced with `raflags="o"` and updated the surrounding comments to explain the `m`/`o`/`mo` string encoding.

4. **`rdnss_lifetime` → `rdnssltime`** and **`dnssl_lifetime` → `dnsslltime`** — confirmed in `config.c` (`makeentry(... "rdnssltime")`, `makeentry(... "dnsslltime")`) and the man page. The post's underscore-separated names would be silently ignored.

5. **Multiple prefix syntax was incorrect.** The post repeated `:addr=...:` and `:prefixlen#...:` keys, which in getcap syntax means the second value overwrites the first — only one prefix would be advertised. Per the man page ("Keywords ... can be augmented with a number, like `prefix2`"), additional prefixes use suffixed keys. Changed the second prefix to `addr2`, `prefixlen2`, `pinfoflags2`.

6. **`SIGUSR1` description was incorrect.** The post claimed `kill -USR1` sends an immediate Router Advertisement. Per `rtadvd(8)`, SIGUSR1 dumps internal state to `/var/run/rtadvd.dump`; SIGHUP reloads the configuration; there is no signal that forces an immediate RA. Updated the description and added the `SIGHUP` reload command.

7. **Minor wording fix:** the original described `::` as "unspecified last 64 bits"; corrected to "zero-compressed last 64 bits", since `::` in the middle of an address is the zero-compression notation, not an "unspecified" indicator.

## Review Notes

- The post is now technically accurate against FreeBSD 13/14 `rtadvd.conf(5)`. The capability syntax (getcap-style with `:` separators, `\` line continuations, `#` for numeric values, `=` for strings) is unusual and easy to confuse with `radvd.conf` (Linux), which is what appears to have happened in the original draft.
- `addrs#N` is the prefix count; there is no equivalent count capability for `rdnss`/`dnssl` — additional entries use suffixed keys (`rdnss0`, `rdnss1`, ..., `dnssl0`, ...). This wasn't introduced into the post since the examples only show one entry, but a future expansion could mention it.
- `service rtadvd status` works on modern FreeBSD when `rtadvd_enable="YES"` is set; on older systems `service rtadvd onestatus` was required. Acceptable as written.
- The `tcpdump` filter `'icmp6 and ip6[40] == 134'` is correct: byte 40 of the IPv6 packet is the ICMPv6 type field (type 134 = RA), assuming no extension headers, which is the normal case for ND messages.
- The RDNSS example does not specify a count; rtadvd discovers entries by suffix iteration, so a single `rdnss` entry without a count works correctly.
