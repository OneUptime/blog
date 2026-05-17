# Validation Summary: How to Set Up Apache mod_cache for Content Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server 2.4 (mod_cache, mod_cache_disk, mod_cache_socache, mod_socache_shmcb)
- mod_headers, mod_expires
- mod_proxy / mod_proxy_http (reverse proxy caching)
- htcacheclean utility
- systemd (service unit for htcacheclean)
- Ubuntu (a2enmod, a2enconf, apache2ctl)

## Sources Consulted
- Apache mod_cache documentation: https://httpd.apache.org/docs/2.4/mod/mod_cache.html
- Apache mod_cache_disk documentation: https://httpd.apache.org/docs/2.4/mod/mod_cache_disk.html
- Apache mod_cache_socache documentation: https://httpd.apache.org/docs/2.4/mod/mod_cache_socache.html
- Apache htcacheclean documentation: https://httpd.apache.org/docs/2.4/programs/htcacheclean.html
- Apache mod_socache_shmcb documentation: https://httpd.apache.org/docs/2.4/mod/mod_socache_shmcb.html
- Apache mod_expires documentation: https://httpd.apache.org/docs/2.4/mod/mod_expires.html

## Issues Found
1. **htcacheclean `-d` interval unit was wrong.** The post originally stated `-d 120` runs the cleaner with "a 120-second interval." Per the official htcacheclean docs, the interval is in **minutes**, not seconds (`-dinterval` — Daemonize and repeat cache cleaning every `interval` minutes). Updated the explanation to clarify that the unit is minutes.
2. **Misleading comment on `CacheIgnoreHeaders`.** The inline comment said "Ignore Authorization headers for caching" but the directive value is `Set-Cookie`. `CacheIgnoreHeaders` controls which response headers are stripped before storing in the cache, and the directive was correctly configured for `Set-Cookie`. Corrected the comment to describe what the directive actually does ("Don't store Set-Cookie headers in the cache").

## Review Notes
- All a2enmod module names (`cache`, `cache_disk`, `cache_socache`, `socache_shmcb`, `headers`, `expires`, `proxy`, `proxy_http`) are correct for current Ubuntu/Debian Apache packaging.
- All mod_cache directives used (`CacheEnable`, `CacheRoot`, `CacheMaxFileSize`, `CacheMinFileSize`, `CacheDefaultExpire`, `CacheMaxExpire`, `CacheIgnoreQueryString`, `CacheDirLevels`, `CacheDirLength`, `CacheQuickHandler`, `CacheDisable`, `CacheLock`, `CacheLockPath`, `CacheLockMaxAge`, `CacheIgnoreHeaders`, `CacheHeader`, `CacheSocache`, `CacheSocacheMaxTime`) match the official Apache 2.4 documentation.
- The `cache-status` environment variable is the correct identifier for the `%{cache-status}e` log/header substitution per the mod_cache docs.
- The `shmcb:/var/run/apache2/cache_socache(512000)` syntax is valid for mod_socache_shmcb (size in bytes). The comment labels 512000 bytes as "512KB" — strictly that's 500 KiB or 512 KB (decimal); close enough to leave as-is.
- The htcacheclean systemd `Type=simple` is acceptable for modern versions where the `-d` flag does not double-fork; the Debian package default also uses `simple`.
- The post mentions Varnish/Nginx as alternatives, which is accurate context.
- All other shell commands (mkdir/chown/chmod, awk, grep|wc, systemctl) are syntactically correct.
