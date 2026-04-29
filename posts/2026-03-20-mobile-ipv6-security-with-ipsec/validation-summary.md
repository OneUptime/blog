# Validation Summary: How to Understand Mobile IPv6 Security with IPsec - With

## Status
validated

## Post Type
Tutorial / Guide — covers IPsec protection of Mobile IPv6 Binding Updates with both manual `ip xfrm` configuration and IKEv2/strongSwan setup.

## Technologies Covered
- Mobile IPv6 (MIPv6) — RFC 6275
- IPsec ESP (transport mode)
- IKEv2 — RFC 5996/7296
- RFC 4877 (MIPv6 operation with IKEv2)
- MOBIKE — RFC 4555
- strongSwan (swanctl/vici configuration)
- Linux `ip xfrm` (iproute2)
- tcpdump / pcap-filter
- Mobility Header (IP protocol 135)

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275)
- RFC 4877 — Mobile IPv6 Operation with IKEv2 and the Revised IPsec Architecture (https://datatracker.ietf.org/doc/html/rfc4877)
- RFC 4555 — IKEv2 Mobility and Multihoming Protocol (MOBIKE) (https://datatracker.ietf.org/doc/html/rfc4555)
- strongSwan documentation — swanctl.conf reference (https://docs.strongswan.org/docs/5.9/swanctl/swanctlConf.html)
- strongSwan documentation — strongswan.conf vs swanctl.conf (https://docs.strongswan.org/docs/5.9/config/configFiles.html)
- pcap-filter(7) man page (tcpdump BPF expression syntax)
- iproute2 `ip-xfrm(8)` man page
- IANA Assigned Internet Protocol Numbers (Mobility Header = 135, ESP = 50)

## Issues Found

1. **Wrong config file path for strongSwan connection definitions.** Both configuration blocks were labelled `/etc/strongswan.conf`, but the `connections { ... children { ... } }` syntax shown is the swanctl/vici format that is loaded via `swanctl --load-all` from `/etc/swanctl/swanctl.conf` (or `/etc/swanctl/conf.d/*.conf`). `/etc/strongswan.conf` is for daemon (charon) settings only — connection definitions placed there are silently ignored. Updated both header comments to `/etc/swanctl/swanctl.conf`.

2. **Broken tcpdump filter for IPv6 ESP.** The original filter `"proto esp and ip6"` cannot match any packet: per `pcap-filter(7)`, `proto <protocol>` is shorthand for `ip proto <protocol>` (IPv4 only), so combining it with `ip6` is a contradiction. Replaced with `'ip6 and esp'`, which correctly matches IPv6 ESP packets.

## Review Notes
- The `prfsha256` token included in `esp_proposals = aes256gcm128-prfsha256-ecp384` is not technically meaningful for ESP (PRF is an IKE concept and is silently filtered by strongSwan for ESP proposals). The minimal correct form would be `aes256gcm128-ecp384`. Left in place since strongSwan accepts the proposal and the example still works as written.
- The post title ends with a trailing "- With" which appears to be a generation artifact, but it is a stylistic/content issue rather than a technical error and was left untouched per scope.
- The `ip xfrm policy` selector uses `proto 135` (numeric). `proto mh` (named) is more idiomatic since iproute2 reads `/etc/protocols`, but the numeric form is equally valid.
- The `auth hmac\(sha256\)` syntax in the `ip xfrm state` example escapes parentheses for the shell rather than quoting; both `'hmac(sha256)'` and `hmac\(sha256\)` produce the same argument. Left as-is.
- All RFC references (6275, 4877, 4555) and the IANA protocol number for the Mobility Header (135) are correct.
- The MOBIKE example's `connections { mipv6-mn { mobike = yes } }` snippet implicitly belongs in the same `swanctl.conf` file the previous fix already corrects, so no additional path edit needed there.
