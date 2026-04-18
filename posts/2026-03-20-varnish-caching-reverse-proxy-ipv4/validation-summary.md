# Validation Summary: How to Set Up a Caching Reverse Proxy for IPv4 with Varnish

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Varnish Cache (HTTP accelerator / reverse proxy)
- VCL (Varnish Configuration Language) 4.1
- systemd service overrides
- Linux CLI tooling (`varnishd`, `varnishadm`, `varnishstat`, `varnishlog`)
- HTTP caching concepts (TTL, grace, purge, ban)
- Varnish directors module (round-robin load balancing)

## Sources Consulted
- Official Varnish Cache documentation: https://varnish-cache.org/docs/
- `varnishd` reference: https://varnish-cache.org/docs/trunk/reference/varnishd.html
- `varnishadm` reference: https://varnish-cache.org/docs/trunk/reference/varnishadm.html
- `varnishstat` reference: https://varnish-cache.org/docs/trunk/reference/varnishstat.html
- VCL backend / probe syntax: https://varnish-cache.org/docs/trunk/reference/vcl-backend.html
- VCL 4.1 language reference: https://varnish-cache.org/docs/trunk/reference/vcl.html
- Directors vmod reference: https://varnish-cache.org/docs/trunk/reference/vmod_directors.html

## Issues Found
- **`varnishadm debug.pools` is not a valid documented command.** The post used it under a "Connected clients" comment, but `debug.pools` does not exist in the Varnish CLI. Replaced it with two documented commands: `varnishadm backend.list` (for backend health / pool status) and `varnishstat -1 -f MAIN.sess_conn -f MAIN.client_req` (for connected-client / session counters).

## Review Notes
- `varnishd -V`, `varnishstat -f … -1`, `varnishadm ban req.url ~ .`, the purge ACL syntax, the probe block fields (`.url`, `.timeout`, `.interval`, `.window`, `.threshold`), the `-a name=addr:port,PROTO` listen-socket syntax, and the directors round-robin setup all check out against official Varnish 6.x/7.x documentation.
- VCL 4.1 auto-coerces INT to STRING for header assignments, so `set resp.http.X-Cache-Hits = obj.hits;` is correct without `std.itoa()`.
- `unset resp.http.X-Varnish` is legal but strips a header that is useful for debugging (transaction IDs in `varnishlog`); operators may want to keep it in lower environments. Not a correctness issue.
- The `/etc/default/varnish` / `DAEMON_OPTS` file is a legacy Debian/Ubuntu init-script mechanism; on modern systemd-based distros the systemd override shown is the canonical approach. The post correctly calls this out.
