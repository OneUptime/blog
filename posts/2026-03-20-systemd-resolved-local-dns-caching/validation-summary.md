# Validation Summary: How to Use systemd-resolved for Local DNS Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- systemd-resolved
- resolvectl
- systemd resolved.conf
- systemd-networkd .network files
- DNS caching
- DNS over TLS
- DNSSEC

## Sources Consulted
- systemd-resolved.service official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- resolved.conf official man page: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- resolvectl official man page: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- systemd.network official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd.syntax official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- Fedora systemd-resolved default change for Fedora 33: https://fedoraproject.org/wiki/Changes/systemd-resolved
- Ubuntu Bionic release notes noting systemd-resolved as the default DNS resolver since 17.10: https://wiki.ubuntu.com/BionicBeaver/ReleaseNotes

## Issues Found
- The `resolved.conf` heredoc used inline comments after configuration values. systemd configuration syntax only treats lines starting with `#` or `;` as comments, so these comments could be parsed as part of the values. Moved the comments to separate lines.
- The `Domains=~.` example was labeled as a DNS search domain and "global fallback." `~.` is a route-only domain that prefers the associated DNS servers for all domains unless a more specific routing domain matches. Updated the comments accordingly.
- `CacheFromLocalhost=no` was described as "Don't cache queries from loopback." The option controls caching of responses received from host-local DNS server addresses such as `127.0.0.1` or `::1`. Corrected the description.
- The cache timing example said the second query should be significantly faster. Cache use depends on TTLs, server state, and measurement noise, so the wording now says it may be faster when cached and still within TTL.
- The cache fill loop used `dig`, which can bypass systemd-resolved depending on `/etc/resolv.conf` mode. Replaced it with `resolvectl query` to exercise systemd-resolved directly.
- The per-interface persistence example implied `/etc/systemd/network/` always applies. These files apply when the interface is managed by systemd-networkd, so the note now says that explicitly.
- The "Disable for Specific Domains" heading described routing, not disabling. Renamed it to "Route Specific Domains."
- The `resolved.conf` split-DNS example showed only `Domains=~company.internal`. Added the matching `DNS=` line in the commented example and clarified that route-only domains use DNS servers in the same configuration scope.
- The conclusion overclaimed that caching applies to all applications, treated an 80% hit rate as a universal target, and described `DNSOverTLS=opportunistic` as privacy without caveat. Narrowed those claims to applications using systemd-resolved, workload-dependent cache hit rates, and best-effort DNS-over-TLS encryption.

## Review Notes
The core commands and configuration keys are current: `resolvectl status`, `statistics`, `flush-caches`, `dns`, and `domain` are valid, and the `DNS=`, `FallbackDNS=`, `Domains=`, `DNSOverTLS=`, `DNSSEC=`, `Cache=`, `CacheFromLocalhost=`, and `DNSStubListener=` settings are valid for modern systemd releases. Cache defaults vary by systemd release and distribution policy, so explicitly setting `Cache=yes` is clearer than relying on defaults.
