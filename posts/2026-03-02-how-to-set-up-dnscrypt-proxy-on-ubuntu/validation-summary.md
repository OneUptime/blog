# Validation Summary: How to Set Up dnscrypt-proxy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dnscrypt-proxy (DNSCrypt and DNS-over-HTTPS proxy)
- DNSCrypt protocol
- DNS-over-HTTPS (DoH)
- DNSSEC
- systemd / systemd-resolved
- Ubuntu apt package manager
- TOML configuration
- dig, tcpdump (testing)

## Sources Consulted
- DNSCrypt/dnscrypt-proxy GitHub releases: https://github.com/DNSCrypt/dnscrypt-proxy/releases (latest 2.1.15, 2025-12-10)
- Official example configuration: https://raw.githubusercontent.com/DNSCrypt/dnscrypt-proxy/master/dnscrypt-proxy/example-dnscrypt-proxy.toml
- Public resolvers list: https://download.dnscrypt.info/resolvers-list/v3/public-resolvers.md
- Verified the actual `linux_x86_64` tarball contents and extraction directory layout

## Issues Found
1. **Outdated download version and wrong architecture identifier.** The post hardcoded `DNSCRYPT_VERSION="2.1.5"` and `ARCH="linux_amd64"`. The actual asset name uses `linux_x86_64` (with an underscore) and the latest release is `2.1.15`. Additionally, the tarball extracts to a directory named `linux-x86_64` (with a dash), so reusing `${ARCH}` for both the download URL and the extracted path would fail. Bumped to `2.1.15` and split into a `PLATFORM` variable (for the asset filename) and an `EXTRACT_DIR` variable (for the extracted directory).
2. **Wrong field name in `[sources]`: `url` → `urls`.** The post used `url = [...]` but dnscrypt-proxy's TOML schema expects `urls = [...]` (plural). Verified against the official example config. Also bumped the `refresh_delay` from `72` to `73` to match the upstream default (both are valid since the accepted range is `[24..168]`, but `73` is what ships in the example).
3. **Invalid Quad9 DoH resolver name.** `quad9-doh-ip4-filter-pri` does not exist in the public resolvers list. The correct name is `quad9-doh-ip4-port443-filter-pri`.
4. **Invalid resolver name `cloudflare-dnscrypt`.** Cloudflare's public resolver does not offer DNSCrypt, only DoH; there is no `cloudflare-dnscrypt` entry in the public resolvers list. Replaced with `cisco` (OpenDNS, which does offer DNSCrypt) so the example still shows two DNSCrypt resolvers.
5. **Non-existent `[filters]` section.** The post used `[filters] ipv4 = true / ipv6 = true` to filter by protocol, but dnscrypt-proxy has no `[filters]` table. Protocol/transport selection is done with the top-level booleans `ipv4_servers`, `ipv6_servers`, `dnscrypt_servers`, and `doh_servers`. Rewrote the snippet using those keys (and demonstrated `doh_servers = false` to restrict to DNSCrypt).
6. **`[cloaking_rules]` is not a TOML table; it is a top-level string key.** The post used `[cloaking_rules]  cloaking_rules_file = '...'`. The correct syntax is `cloaking_rules = '/etc/dnscrypt-proxy/cloaking-rules.txt'`.
7. **`[cache]` table does not exist.** The post wrote `[cache]` with `size`, `min_ttl`, `max_ttl`, `neg_min_ttl`, `neg_max_ttl`. These are top-level keys named `cache`, `cache_size`, `cache_min_ttl`, `cache_max_ttl`, `cache_neg_min_ttl`, and `cache_neg_max_ttl`. Rewrote as flat top-level keys and added `cache = true` to actually enable caching.
8. **Misleading `ignored_qtypes` comment.** The comment said "Don't log queries matching these patterns", but `ignored_qtypes` filters by DNS record type, not by name pattern. Reworded the comment to clarify it operates on record types (and noted PTR = reverse lookups).
9. Minor: corrected the `lb_strategy = 'p2'` inline comment ("pick 2 random servers, use the faster one") to the more accurate description from the official config ("pick 1 of the 2 fastest servers by latency").

## Review Notes
- The Cloudflare DNS stamp shown for `cloudflare-manual` is the historical published stamp for `1.1.1.1 / cloudflare-dns.com` and decodes correctly; it is purely illustrative since the same server is available via the `cloudflare` entry in the public resolvers list.
- `lb_strategy = 'p2'` is still supported, but the current default in upstream is `'wp2'` (Weighted Power of Two). The post's choice of `p2` is intentional and correct for the explanation given, so it was left as-is.
- `DNS=127.0.0.1:5300` in `resolved.conf` requires systemd 247+ (port-in-DNS support was added in 2020). This is fine for Ubuntu 22.04 and newer, but would not work on older releases — not changed because the post targets Ubuntu generically and modern Ubuntu LTS releases all qualify.
- The `grep -v "^0\.0\.0\.0$"` after the `awk '{print $2}'` pipeline is harmless but redundant — `$2` from a `0.0.0.0 host` line will never be `0.0.0.0` itself. Left as-is since it is not technically incorrect.
- The NiceHash blocklist URL is unusual choice for an "ad/malware" list (NiceHash's lists are mining-focused); Steven Black's list is the more standard choice. The URL itself is plausible/valid for that repo, so this is left as a stylistic note rather than a technical error.
