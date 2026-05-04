# Validation Summary: How to Configure IPv6 Privacy Extensions on macOS

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- IPv6 SLAAC (Stateless Address Autoconfiguration)
- IPv6 Privacy Extensions (RFC 4941, obsoleted by RFC 8981)
- IPv6 Stable Privacy Addresses (RFC 7217)
- macOS networking (`ifconfig`, `sysctl`, `route`, `nc`, `curl`)
- macOS persistent configuration via LaunchDaemons / launchd plists
- Comparison with Linux IPv6 sysctl (`net.ipv6.conf.*.use_tempaddr`, `addr_gen_mode`)

## Sources Consulted
- [RFC 4941 — Privacy Extensions for SLAAC in IPv6](https://datatracker.ietf.org/doc/html/rfc4941)
- [RFC 7217 — Semantically Opaque Interface Identifiers with SLAAC](https://datatracker.ietf.org/doc/html/rfc7217)
- [RFC 8981 — Temporary Address Extensions for SLAAC in IPv6](https://datatracker.ietf.org/doc/html/rfc8981)
- [Apple Platform Security — IPv6 security](https://support.apple.com/guide/security/ipv6-security-seccb625dcd9/web)
- macOS `ifconfig(8)` man page (FreeBSD/Darwin) — `-L` flag, `pltime`/`vltime` output, `temporary`/`autoconf`/`secured` flags
- macOS `sysctl(8)` and `sysctl.conf(5)` behavior on modern macOS
- [Apple Community — Persistent sysctl Settings](https://discussions.apple.com/thread/253840320)
- [GitHub gist — sysctl.conf stand-in on macOS 10.15+](https://gist.github.com/pythoninthegrass/8073e5e3b24f385c9d9b712f6f243982)

## Issues Found

1. **Incorrect lifetime field names in `View Temporary Addresses` section.**
   The original text instructed readers to look for `preferred_lft` and
   `valid_lft` "inline" in the `ifconfig` output. Those field names are from
   Linux's `ip -6 addr` command and do not appear in macOS `ifconfig` output
   at all. macOS uses the FreeBSD-style names `pltime` (preferred lifetime)
   and `vltime` (valid lifetime), and they are not shown by default — the
   `-L` flag is required (e.g. `ifconfig -L en0 inet6`).
   **Fix:** updated the example to call `ifconfig -L en0 inet6` and to
   reference `pltime` / `vltime`.

2. **Incorrect persistence mechanism: `/etc/sysctl.conf` on macOS.**
   The post originally told users to append values to `/etc/sysctl.conf` and
   noted that "/etc/sysctl.conf is loaded at boot on macOS." This is not true
   on modern macOS — `/etc/sysctl.conf` has not been read at boot since
   roughly macOS Catalina (10.15) and the file does not even exist by default
   on current releases. Persistent sysctl values on modern macOS must be
   applied via a LaunchDaemon that runs `sysctl` at boot.
   **Fix:** replaced the `/etc/sysctl.conf` example with a LaunchDaemon plist
   in `/Library/LaunchDaemons/com.local.ipv6-privacy.plist` loaded with
   `launchctl load`. Also updated the "Disable Temporary Addresses" section
   and the closing summary to point at the LaunchDaemon approach instead of
   `/etc/sysctl.conf`.

## Review Notes

- The post references **RFC 4941** for temporary addresses. This is still the
  most commonly cited reference, but RFC 4941 was obsoleted by **RFC 8981**
  in February 2021. The mechanism and sysctl knobs described are the same;
  citing RFC 4941 is acceptable but readers writing new specifications should
  prefer RFC 8981.
- The claim that stable privacy addresses (RFC 7217) have been enabled by
  default on macOS "since macOS Sierra" is approximately correct in spirit —
  macOS has produced "secured" (RFC 7217-style) SLAAC addresses for many
  releases — but Apple's published documentation does not call out an exact
  version. Apple's current security guide describes the addresses as
  "similar to the Network_ID parameter as of RFC 7217." This was left
  unchanged because no contradicting authoritative source was found.
- The example output uses `prefixlen 64 autoconf` and
  `prefixlen 64 autoconf temporary` — both are flags macOS `ifconfig`
  actually emits for SLAAC and temporary addresses. The "secured" flag (used
  for RFC 7217 / CGA-style stable addresses) is not shown in the sample
  output but would also be present on a real macOS system; this is a minor
  omission, not an error.
- `nc -6 -v <addr> 443` and `route -n get -inet6 <addr>` are correct on
  macOS. `curl -6 -v https://ipv6.google.com` is correct, though grepping
  for `Connected\|IPv6` may not match every libcurl version's verbose
  output — readers may need to look at the full `curl -v` output to see the
  source address.
- The Linux comparison row "Prefer temp / Configurable (use_tempaddr=2)" is
  accurate: on Linux, `use_tempaddr=2` both generates temporary addresses
  and prefers them as the source for outgoing connections.
