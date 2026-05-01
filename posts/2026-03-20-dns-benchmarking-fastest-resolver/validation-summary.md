# Validation Summary: How to Use DNS Benchmarking Tools to Find the Fastest Resolver

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- `dig` / BIND DNS utilities
- `dnsperf` / `resperf`
- `systemd-resolved`
- `/etc/resolv.conf`
- Cloudflare 1.1.1.1
- Google Public DNS / DNS-over-HTTPS

## Sources Consulted
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- DNS-OARC `dnsperf` overview: https://www.dns-oarc.net/tools/dnsperf
- Debian man page for `dnsperf`: https://manpages.debian.org/testing/dnsperf/dnsperf.1.en.html
- Debian man page for `resperf`: https://manpages.debian.org/unstable/dnsperf/resperf.1.en.html
- Debian man page for `resolved.conf(5)`: https://manpages.debian.org/bookworm/systemd-resolved/resolved.conf.5.en.html
- Cloudflare `/cdn-cgi/` endpoint docs: https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/
- Google Public DNS DoH docs: https://developers.google.com/speed/public-dns/docs/doh/
- Archived upstream `namebench` repository: https://github.com/google/namebench
- Local verification: `python3 -m pip index versions namebench`, `curl -I -L https://namebench.googlecode.com/files/namebench-1.3.1-source.tgz`, `curl -I https://dns.google`, `curl https://cloudflare.com/cdn-cgi/trace`, `dig @45.90.28.0 example.com`, `dig -h`, `resolvectl --help`

## Issues Found
- The description referenced `dnsperftest`, which did not match the actual tools used. I corrected it to reflect the current `dig`/`resperf`-based guidance.
- The introduction and conclusion made overly broad claims about regional winners and implied Cloudflare or Google would usually win. I changed that wording to keep the result location- and query-dependent.
- The `namebench` section was obsolete. The Google Code download URL now returns `404`, PyPI no longer provides a `namebench` package, and the archived upstream repository says the current rewrite does not support the old CLI flags. I replaced the section with a historical note.
- The load-testing section used `dnsperf` against public recursive resolvers. DNS-OARC documents `dnsperf` as primarily for authoritative servers and recommends `resperf` for caching resolvers on the live Internet. I rewrote that section accordingly and limited the example to a controlled resolver or lab target.
- The cache-hit section said random subdomains "won't be cached," which was too absolute. I changed the wording to "reduce answer-cache hits" because some supporting data can still be cached.
- The regional section claimed traceroute hop count proves proximity and said `curl https://dns.google` shows server info. I removed the hop-count claim, switched the Cloudflare example to the documented `cloudflare.com/cdn-cgi/trace` endpoint, and replaced the Google example with the documented DoH JSON API plus an accurate note about its scope.
- The `systemd-resolved` example used `FallbackDNS=` as if it were an ordered backup while `DNS=` was already set. Per `resolved.conf(5)`, `FallbackDNS=` is only used when no other DNS server information is known, so I moved the intended servers into `DNS=` and clarified the behavior.
- The quick benchmark script labeled the `/etc/resolv.conf` entry as `Local`, but that can be a system stub rather than a direct ISP resolver. I renamed it to `System` and updated the conclusion to match what the script actually measures.

## Review Notes
- The quick script is appropriate for rough latency comparisons, but it is still a simple serial benchmark and not a substitute for controlled throughput testing.
- On some Linux distributions, `dig` and `traceroute` are not installed by default even though the command syntax shown is valid.
