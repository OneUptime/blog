# Validation Summary: How to Monitor IPv6 Network Statistics on Linux with ss

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `ss` (socket statistics) command from iproute2
- IPv6 networking
- Linux command-line filtering and pipelines (awk, sed, watch)
- `netstat` command (referenced for comparison)

## Sources Consulted
- iproute2 `ss(8)` man page (https://man7.org/linux/man-pages/man8/ss.8.html)
- iproute2 source / `ss --help` output (verified against iproute2-6.1.0)
- Live testing of ss commands on a Linux host
- RFC 4007 (IPv6 Scoped Address Architecture) for zone ID `%` notation

## Issues Found

1. **Broken IPv6 address truncation pipeline (`cut -d: -f1-7`)** — The original command:
   ```
   ss -6 -tn state established | awk '{print $5}' | cut -d: -f1-7
   ```
   does not reliably strip the port from IPv6 peer addresses. For compressed addresses like `[2001:db8::20]:51234`, the string contains only 5 colons, so `cut -f1-7` returns the entire string (port not stripped). For fully expanded addresses like `[2a01:4b00:ae2c:5f00:782f:3874:d290:a9a8]:55220`, it actually truncates the address itself, yielding `[2a01:4b00:ae2c:5f00:782f:3874:d290`. Replaced with `awk 'NR>1 {print $5}' | sed 's/]:[0-9]*$/]/'`, which correctly drops the trailing `]:port` for any IPv6 address form and skips the header line.

2. **Invalid IPv6 dst/src filter syntax** — `ss -6 dst 2001:4860:4860::8888` fails on iproute2 with `Error: an inet prefix is expected rather than "2001:4860:4860::8888". Cannot parse dst/src address.` IPv6 addresses must be enclosed in brackets (or specified with a prefix length). Updated both the `dst` and `src` examples to use bracketed form `'[<addr>]'`.

3. **`sport`/`dport` filters without a protocol flag produce RTNETLINK errors** — `ss -6 sport = :443` (and the `dport` variant) emit `RTNETLINK answers: Invalid argument` because the filter is also applied to socket families that don't support port filtering. Added `-t` so the filter targets TCP sockets, matching how the next example in the post already qualifies the protocol.

4. **Misleading `-e` flag description** — The original comment said `ss -6 -une` shows "receive/send queue sizes". `Recv-Q` and `Send-Q` are shown by default; `-e`/`--extended` shows detailed socket information (uid, inode, socket cookie). Updated the comment to accurately describe what `-e` adds.

## Review Notes

- The `[::]:80` LISTEN entries in the "Understanding ss Output" section are accurate for dual-stack listeners; on systems with `net.ipv6.bindv6only=1` they would only accept IPv6, but the post's claim that `[::]:` means "Listening on all IPv6 addresses" is correct in either case.
- `ss -6 -s` produces the same global summary as `ss -s` (the summary always shows both IPv4 and IPv6 broken down). The example output in the post is correct, but the `-6` flag is effectively a no-op for `-s`. Left as-is since the example output is accurate.
- The `grep '%'` trick to find link-local UDP sockets via the zone-ID delimiter works, though the comment loosely describes them as "mDNS/multicast". Link-local addresses (fe80::/10) are commonly where mDNS multicast traffic lives, so the description is imprecise but not technically wrong; left untouched per minimal-edits guidance.
- The `awk 'NR>1 {counts[$1]++}'` state-counting one-liner relies on the `State` column being first, which matches modern iproute2 output. Adding `-H` (--no-header) would be a cleaner alternative but the existing `NR>1` approach is correct.
