# Validation Summary: How to Optimize Apache Performance for High Traffic on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Apache HTTP Server 2.4 (apache2 on Ubuntu)
- Event MPM
- mod_deflate (compression)
- mod_expires / mod_headers (browser caching)
- mod_cache / mod_cache_disk (server-side caching)
- mod_http2
- apache2ctl, a2enmod / a2dismod / a2enconf
- ab (Apache Bench) from apache2-utils
- Linux kernel TCP sysctls
- systemd unit overrides and /etc/security/limits.conf

## Sources Consulted
- Apache 2.4 core directives: https://httpd.apache.org/docs/2.4/mod/core.html
- mod_cache: https://httpd.apache.org/docs/2.4/mod/mod_cache.html
- mod_cache_disk: https://httpd.apache.org/docs/2.4/mod/mod_cache_disk.html
- mod_deflate: https://httpd.apache.org/docs/2.4/mod/mod_deflate.html
- mod_expires: https://httpd.apache.org/docs/2.4/mod/mod_expires.html
- Event MPM: https://httpd.apache.org/docs/2.4/mod/event.html
- RFC 8081 (font/* media types): https://www.rfc-editor.org/rfc/rfc8081.txt

## Issues Found
1. **`DeflateCompressionLevel` comment was wrong.** The directive sets the actual compression level (1-9), not a "minimum". Updated the comment to reflect that 6 is the chosen level.
2. **mod_cache section intro contradicted the configuration used.** The text said "cached content served entirely from memory" but the example uses `mod_cache_disk`, which is a disk-backed cache (memory caching would require `mod_cache_socache`). Rewrote the intro to describe a persistent on-disk cache.
3. **`CacheMaxExpire 86400` comment was wrong.** The directive is a time in seconds (max retention without revalidation), not a size value. Updated the comment to describe it correctly (1 day in seconds).
4. **`CacheLastModifiedFactor 0.5` comment was wrong.** The directive is not a "don't cache if newer than X" threshold; it's the multiplier used to derive an expiry from the Last-Modified header when no explicit expiration is set (`expiry = now + (now - Last-Modified) * factor`). Replaced the comment with the correct formula.
5. **"HostnameLookups defaults to On" claim was wrong.** Modern Apache has defaulted `HostnameLookups` to `Off` for a very long time. Reworded the section to note that setting it explicitly is still a sensible defense-in-depth measure but it is not flipping a hot default.

## Review Notes
- `KeepAliveTimeout` and `MaxKeepAliveRequests` are core directives, not MPM directives. Putting them inside `<IfModule mpm_event_module>` in `mpm_event.conf` is syntactically valid and works, but it is mildly misleading because the same values apply under any MPM. Left as-is because the post also (correctly) sets them in `apache2.conf` in the subsequent section, and the duplication is harmless.
- `net.ipv4.tcp_tw_reuse = 1` and `net.ipv4.tcp_fin_timeout = 30` are widely used but situational. On Linux 4.12+ `tcp_tw_reuse` is safer than it used to be; the post does not (correctly) recommend the removed `tcp_tw_recycle`.
- The `apache2ctl status` command in the post-benchmark section requires `mod_status` enabled and a text-mode browser (e.g. `lynx`) installed; the earlier "Disabling Unnecessary Modules" section already flags keeping `status` if monitoring is needed, so this is internally consistent.
- `font/woff` and `font/woff2` are the current IANA-registered MIME types per RFC 8081 — the post is correct to prefer them over the deprecated `application/font-woff(2)`.
