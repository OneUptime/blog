# Validation Summary: How to Test CDN IPv6 Connectivity

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 connectivity testing
- DNS AAAA records and `dig`
- `curl`, `wget`, HTTPie, and Python `urllib.request`
- CDN edge and cache response headers
- Globalping CLI
- Prometheus Blackbox Exporter
- Prometheus scrape configuration

## Sources Consulted
- curl man page: https://curl.se/docs/manpage.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/latest/manpages.html
- RFC 3596, DNS Extensions to Support IPv6: https://www.rfc-editor.org/rfc/rfc3596
- RFC 9111, HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111
- Globalping CLI docs: https://globalping.io/cli
- Globalping CLI GitHub README: https://github.com/jsdelivr/globalping-cli
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- Python `urllib.request` docs: https://docs.python.org/3/library/urllib.request.html
- HTTPie CLI docs: https://httpie.io/docs/cli
- Prometheus Blackbox Exporter configuration docs: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Cloudflare HTTP headers docs: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Fastly `X-Served-By` header docs: https://www.fastly.com/documentation/reference/http/http-headers/X-Served-By/

## Issues Found
- The CDN header `grep` examples were case-sensitive, which can miss lowercase response headers, especially with HTTP/2. Updated them to use case-insensitive matching and anchored header names.
- The cache examples stated that the first request should be a MISS and the second should be a HIT. This is not guaranteed because objects may already be cached, may not be cacheable, or may be served by a different edge. Adjusted the comments and included Cloudflare's `cf-cache-status` header in the cache checks.
- The Globalping install command used an npm package name that is not published, and the command used `--type ipv6`, which is not a current Globalping CLI flag. Replaced it with the official Ubuntu/Debian install example and `--ipv6`.
- The automated TTFB check used `bc` and could report a fast TTFB even when the `curl` request failed. Updated it to capture the `curl` exit status and use `awk` for the numeric comparison.
- The Python example was labeled as `requests` but used `urllib.request`, and it did not force IPv6. Updated it to describe `urllib` correctly and force IPv6 resolution with `socket.AF_INET6`.
- The HTTPie example did not force IPv6. Added a note that HTTPie uses system resolver behavior and that `curl -6` or `wget -6` should be used when IPv6 must be forced.
- The Blackbox Exporter module and Prometheus scrape configuration were shown as one YAML file. Split them into separate `blackbox.yml` and `prometheus.yml` snippets because they belong to different applications.

## Review Notes
- The post uses `cdn.example.com` and example paths; readers must replace them with their own CDN hostname and cacheable assets.
- The HTTPie example is retained as a client-path check, but it is not an IPv6-only test.
- Local validation performed: extracted Bash snippets passed `bash -n`, YAML snippets parsed successfully with PyYAML, and the updated Python snippet parsed successfully.
