# Validation Summary: How to Configure Unbound as a Recursive IPv6 DNS Server

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Unbound (NLnet Labs recursive DNS resolver)
- IPv6 (AAAA, link-local, ULA/GUA)
- DNSSEC (auto-trust-anchor, unbound-anchor)
- DNS-over-TLS (DoT, RFC 7858)
- QNAME minimisation (RFC 7816)
- systemd, dig, ss, curl, apt-get, dnf

## Sources Consulted
- Unbound man page `unbound.conf(5)` — server options, forward-zone, forward-addr syntax (`@port#authname`), `forward-tls-upstream`
- NLnet Labs Unbound documentation: https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- Cloudflare DNS-over-TLS docs: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/ (canonical hostname `one.one.one.one`, port 853)
- Google Public DNS DoT docs: https://developers.google.com/speed/public-dns/docs/dns-over-tls (auth name `dns.google`, port 853)
- IANA / Internic root hints reference (`https://www.internic.net/domain/named.root`)
- unbound-anchor and unbound-checkconf man pages

## Issues Found
1. **`forward-tls-upstream` example would not actually work.** The original config set `forward-tls-upstream: yes` but listed addresses without a port or TLS authentication name (e.g., `forward-addr: 2606:4700:4700::1111`). Per the Unbound man page, addresses are not auto-promoted to port 853 when `forward-tls-upstream` is enabled — the operator must explicitly write `@853` and supply `#authname` for certificate validation. The setting is also per-zone, so all addresses in the zone must speak DoT (mixing plain `8.8.8.8` would fail). Additionally, no `tls-cert-bundle` was configured, so cert validation would have no trust store. Fixed by:
   - Adding `tls-cert-bundle: "/etc/ssl/certs/ca-certificates.crt"` under `server:`.
   - Rewriting forward addresses as `2606:4700:4700::1111@853#one.one.one.one`, `2606:4700:4700::1001@853#one.one.one.one`, and `8.8.8.8@853#dns.google` — using the canonical TLS auth names from Cloudflare and Google's official DoT documentation.
   - Adding a clarifying comment that `forward-tls-upstream` is per-zone and applies to every `forward-addr`.

## Review Notes
- `interface: ::0`, `prefer-ip6: yes`, `qname-minimisation` (British spelling), `harden-glue`, `harden-dnssec-stripped`, `auto-trust-anchor-file`, `prefetch`, `prefetch-key`, `outgoing-range`, `num-queries-per-thread`, `outgoing-port-permit`, and `root-hints` are all valid Unbound options matching the current `unbound.conf(5)` man page.
- `unbound-checkconf`, `unbound-anchor -a /var/lib/unbound/root.key`, and the `auto-trust-anchor-file` workflow are correct. On many distros the unbound package ships with a periodic refresh of `root.key` already configured.
- `unbound-control stats_noreset` requires `unbound-control-setup` to have been run first to provision the control-channel TLS keys; the post does not mention this prerequisite but the command itself is correct.
- `ss -lnpu | grep unbound` only verifies UDP listeners. DNS also uses TCP, so `ss -lntp` (or `ss -lnp`) would be a more complete check, but the UDP-only command is not technically wrong.
- The `dig ... -b 2001:db8:99::1` access-control test only works if that source address is actually configured on a local interface; otherwise dig returns an error rather than demonstrating REFUSED. The example illustrates the concept but operators may need to use a different source-host setup to truly observe the refusal.
- `outgoing-port-permit: 1024-65535` applies to both IPv4 and IPv6 outbound source ports; the comment scoping it to "IPv6 source port randomization" is slightly misleading but not factually wrong.
- Cloudflare's `cloudflare-dns.com` still validates against the certificate SAN list, but `one.one.one.one` is the canonical hostname in current Cloudflare documentation and was used in the fix.
