# Validation Summary: How to Configure DNS-over-TLS (DoT) with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS-over-TLS (DoT)
- IPv6
- Unbound
- dnsdist
- systemd-resolved
- kdig
- OpenSSL
- Ncat
- ip6tables

## Sources Consulted
- RFC 7858, "Specification for DNS over Transport Layer Security (TLS)": https://www.rfc-editor.org/rfc/rfc7858.html
- RFC 8310, "Usage Profiles for DNS over TLS and DNS over DTLS": https://www.rfc-editor.org/rfc/rfc8310.html
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound configuration guide: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- dnsdist DNS-over-TLS guide: https://www.dnsdist.org/guides/dns-over-tls.html
- dnsdist configuration reference: https://www.dnsdist.org/reference/config.html
- `resolved.conf` manual: https://www.freedesktop.org/software/systemd/man/254/resolved.conf.html
- Google Public DNS-over-TLS documentation: https://developers.google.com/speed/public-dns/docs/dns-over-tls
- Cloudflare 1.1.1.1 DNS-over-TLS documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Quad9 services documentation: https://docs.quad9.net/services/
- OpenSSL `req` documentation: https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.6/man1/openssl-s_client/
- OpenSSL `x509` documentation: https://docs.openssl.org/4.0/man1/openssl-x509/
- Knot DNS `kdig` manual: https://knot.pages.nic.cz/knot-dns/master/html/man_kdig.html
- Ncat SSL guide: https://nmap.org/ncat/guide/ncat-ssl.html

## Issues Found
- The self-signed OpenSSL example only set `CN=dns.example.com`. I added `subjectAltName = DNS:dns.example.com` because current DoT hostname validation relies on the authentication name being present in the certificate SAN.
- The Unbound forwarding example enabled `forward-tls-upstream: yes` without loading trusted CA certificates. I added `tls-system-cert: yes` so upstream DoT certificate validation can work.
- The `systemd-resolved` example set both `DNSOverTLS=yes` and `DNSOverTLS=opportunistic`. I removed the conflicting `opportunistic` line because only one mode can be active, and the later line would otherwise override the strict setting.
- The dnsdist example included `alpn = {"dot"}` in `addTLSLocal()`. I removed it because I could not validate that option in the current documented `addTLSLocal()` listener options.
- The `kdig` example used opportunistic TLS only. I changed it to `+tls-ca +tls-hostname=dns.google` so the example actually validates the server identity.
- The `openssl s_client` test did not send SNI or verify the hostname. I updated it to use `-servername` and `-verify_hostname`.
- The `dig ... -p 853 +tcp` example sent cleartext DNS to a DoT port. I removed it because RFC 7858 says cleartext DNS must not be used on port 853.
- The `ncat` example only established TLS without verification. I updated it to use `--ssl-verify`.
- The monitoring example used the invalid placeholder `2001:db8::dns`. I replaced it with the valid documentation-prefix address `2001:db8::53` and updated the command to print certificate subject, issuer, and dates after a verified handshake.
- The provider table header said `SPKI/Hostname`, but the column contained only authentication hostnames. I renamed the header to `Hostname`.
- The firewall save command path is distribution-specific. I clarified that the shown `ip6tables-save` destination is an example appropriate for Debian-style `iptables-persistent` setups.

## Review Notes
- `systemd-resolved` global `DNS=` and `DNSOverTLS=` settings are technically valid, but per-link DNS settings from NetworkManager or `systemd-networkd` can still affect the effective upstream configuration. Checking `resolvectl status` is still important after applying the config.
- The post still uses `ip6tables`, which is valid on many Linux systems. Some newer distributions prefer nftables, but that does not make the example incorrect.
