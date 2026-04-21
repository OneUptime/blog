# Validation Summary: How to Configure Squid DNS Lookups to Return IPv4 Only (dns_v4_first)

## Status
validated

## Post Type
Technical guide / Configuration tutorial

## Technologies Covered
- Squid proxy configuration
- Squid DNS resolution and IPv6 behavior
- `dns_v4_first`, `dns_nameservers`, `dns_timeout`, and `http_port`
- Squid Cache Manager / IP cache verification
- Linux resolver policy (`/etc/gai.conf`, `getaddrinfo()`)
- Linux DNS and socket inspection commands (`getent`, `dig`, `ss`)

## Sources Consulted
- Squid configuration directive `dns_v4_first` — https://www.squid-cache.org/Doc/config/dns_v4_first/
- Squid 5 release notes: Happy Eyeballs update and `dns_v4_first` removal — https://www.squid-cache.org/Versions/v5/RELEASENOTES.html
- Squid configuration directive `http_port` — https://www.squid-cache.org/Doc/config/http_port/
- Squid configuration directive `dns_nameservers` — https://www.squid-cache.org/Doc/config/dns_nameservers/
- Squid configuration directive `dns_timeout` — https://www.squid-cache.org/Doc/config/dns_timeout/
- Squid IPv6 feature documentation — https://wiki.squid-cache.org/Features/IPv6
- Squid Cache Manager documentation — https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid Cache Manager `ipcache` report — https://wiki.squid-cache.org/Features/CacheManager/IpCache
- Squid `cache_object` scheme removal / `/squid-internal-mgr` note — https://wiki.squid-cache.org/Features/CacheManager/CacheObjectScheme
- RFC 6724: Default Address Selection for IPv6 — https://www.rfc-editor.org/rfc/rfc6724
- Linux `gai.conf(5)` manual — https://man7.org/linux/man-pages/man5/gai.conf.5.html
- Linux `getent(1)` manual — https://man7.org/linux/man-pages/man1/getent.1.html
- Linux `ss(8)` manual — https://man7.org/linux/man-pages/man8/ss.8.html
- BIND `dig` syntax verified with local `dig -h` output and ISC BIND manual pages — https://bind9.readthedocs.io/en/v9.18.45/manpages.html

## Issues Found
- **`dns_v4_first` version scope**: The post presented `dns_v4_first` as a current Squid directive. Squid documentation shows it is available only in Squid 3.1.16 through 4.x and removed in Squid 5 and newer. Updated the title, introduction, Fix 1, and takeaways to make the version scope explicit.
- **IPv4-only wording**: The original title and examples implied `dns_v4_first` makes DNS lookups return IPv4 only. Squid's documentation says Squid still performs both IPv4 and IPv6 DNS lookups; the directive only changes connection preference. Reworded affected claims to "prefer IPv4" instead of "return IPv4 only."
- **Default resolver / RFC 6724 explanation**: The post said Squid follows the system resolver preference and that DNS may return AAAA first per RFC 6724. RFC 6724 defines address selection and sorting behavior for APIs such as `getaddrinfo()`, not DNS server record ordering. Updated the explanation to distinguish Squid 4 behavior, Squid 5+ Happy Eyeballs behavior, and RFC 6724 address sorting.
- **IPv6 disablement snippet**: The post claimed `dns_v4_first on` plus `http_port 0.0.0.0:3128` disables IPv6 sockets and forces outbound IPv4. `http_port` binding only restricts Squid's client listener; it does not disable outbound IPv6. Replaced that section with an IPv4-only listener example and noted that strict outbound IPv4-only behavior requires firewall rules, DNS recursive-resolver configuration, or a Squid build without IPv6 support where available.
- **`/etc/gai.conf` scope**: The post claimed `gai.conf` affects all applications including Squid. It only affects applications using the system `getaddrinfo()` address selection policy, and Squid's internal resolver or Happy Eyeballs behavior may not rely on it. Added that caveat.
- **DNS resolver wording**: The post described a DNS server that "returns only A records." Clarified this as a resolver that answers A queries normally and suppresses or filters AAAA responses for the relevant domains.
- **Cache Manager verification command**: The post used `squidclient ... mgr:dns` to check hostname resolution. The hostname-to-IP DNS cache is exposed by the Cache Manager `ipcache` report, and modern Squid supports the `/squid-internal-mgr/ipcache` HTTP path. Replaced the primary command with `curl` against that path and changed the optional `squidclient` example to `mgr:ipcache`.
- **System resolver verification command**: Replaced `getent hosts example.com` with `getent ahosts example.com` because `ahosts` uses `getaddrinfo()` with `AF_UNSPEC`, which better matches address-family selection checks.
- **Socket inspection wording**: The original command claimed real-time watching while using a one-shot `ss` invocation. Updated the comment to describe listing current TCP connections and adjusted the grep pattern to avoid matching the grep process.

## Review Notes
- `dns_nameservers 192.168.1.53`, `dns_timeout 30 seconds`, `http_port 0.0.0.0:3128`, and the `dig +short A/AAAA ... @server` examples are valid syntax.
- `dns_timeout 30 seconds` is valid but is also Squid's documented default.
- Squid 7 removed `squidclient`, so the `curl` Cache Manager example is the safer primary verification command.
