# Validation Summary: How to Set Up Nginx with GeoIP Module on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Nginx (web server, dynamic modules)
- ngx_http_geoip2_module (third-party Nginx module by Lev Shamardin)
- MaxMind GeoLite2 databases (Country, City) in `.mmdb` format
- `geoipupdate` CLI (MaxMind database update tool)
- `mmdblookup` CLI (from `mmdb-bin`)
- Ubuntu apt packaging (`libnginx-mod-http-geoip2`, `geoipupdate`)
- Cron for scheduled database refresh
- Nginx `map`, `if`, `limit_req_zone`, `log_format`, `proxy_set_header` directives

## Sources Consulted
- ngx_http_geoip2_module README: https://github.com/leev/ngx_http_geoip2_module
- MaxMind GeoIP Update documentation: https://dev.maxmind.com/geoip/updating-databases
- MaxMind GeoLite2 free databases / signup: https://www.maxmind.com/en/geolite2/signup
- Nginx documentation for `map`, `limit_req_zone`, `load_module`, `log_format`, `if`, `proxy_set_header`
- Ubuntu (Jammy/Noble) package listings for `libnginx-mod-http-geoip2`, `geoipupdate`, `mmdb-bin`, `geoip-bin`

## Issues Found
1. **Incorrect lookup tool at the end of the post.** The original final command was:
   ```bash
   geoiplookup 8.8.8.8  # If geoipupdate installed this binary
   ```
   `geoiplookup` is shipped by the `geoip-bin` package (legacy GeoIP v1) and only reads `.dat` databases, not the `.mmdb` GeoIP2 databases that the rest of this guide uses. It is also not installed by `geoipupdate`. Replaced with the correct tool for `.mmdb` files:
   ```bash
   # Check what country an IP resolves to (install mmdb-bin first: sudo apt install mmdb-bin)
   mmdblookup --file /var/lib/GeoIP/GeoLite2-Country.mmdb --ip 8.8.8.8
   ```
   This actually works against the GeoLite2-Country.mmdb the guide downloaded.

## Review Notes
- The `nginx -V 2>&1 | grep -o with-http_geoip` check is a weak heuristic: on Ubuntu, the GeoIP2 module is provided as a dynamic module via the `libnginx-mod-http-geoip2` package and is loaded by `/etc/nginx/modules-enabled/50-mod-http-geoip2.conf`, not compiled into the nginx binary itself. The companion `ls /usr/lib/nginx/modules/ | grep geoip` check is the more reliable confirmation and is already included.
- Repeated `if` directives inside `server` blocks are accepted by Nginx but are widely discouraged (see "If is Evil" on the Nginx wiki). They work as written here and are commonly used for country-blocking/redirect patterns, so left as-is.
- `geoipupdate` configuration uses `AccountID`/`LicenseKey`/`EditionIDs` — correct for geoipupdate >= 2.5.0 (Ubuntu 22.04 ships 4.x). Older `UserId`/`ProductIds` keys are not needed.
- The `ngx_http_geoip2_module` syntax used (`geoip2 <path> { $var [default=...] field path; }`) matches the upstream module documentation. Variable definitions for `country iso_code`, `country names en`, `city names en`, `subdivisions 0 iso_code`, `location latitude`, `location longitude` are all valid GeoLite2 paths.
- The `awk '{print $3}'` log-analysis one-liner correctly extracts the country code given the custom `log_format geo_combined` defined immediately above it.
- MaxMind discontinued GeoIP Legacy (.dat) databases in 2019 — the post's statement is accurate.
- Optional future improvement: mention `auto_reload <interval>;` inside the `geoip2 { }` block so Nginx picks up new databases after `geoipupdate` runs without a reload, but this is an enhancement, not a correctness issue.
