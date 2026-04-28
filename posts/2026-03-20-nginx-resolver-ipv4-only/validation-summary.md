# Validation Summary: How to Configure the Nginx Resolver to Use IPv4 Only (ipv6=off)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (`resolver` directive in `http` and `stream` contexts)
- DNS (A and AAAA records, TTL caching)
- IPv4 / IPv6 networking
- Linux CLI utilities (`nginx -t`, `systemctl`, `nslookup`, `tail`)

## Sources Consulted
- Nginx HTTP Core module — `resolver` directive: http://nginx.org/en/docs/http/ngx_http_core_module.html#resolver
- Nginx Stream Core module — `resolver` directive: http://nginx.org/en/docs/stream/ngx_stream_core_module.html#resolver
- Nginx HTTP Proxy module — `proxy_pass` (variable-based runtime resolution): http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass

## Issues Found
- **Multiple DNS server behavior misdescribed.** The "Resolver with Multiple DNS Servers" example commented `# Try 8.8.8.8 first, fall back to 1.1.1.1`. Per the Nginx docs, when several name servers are listed they are queried in round-robin fashion, not in primary/failover order. Updated the comment to `# Query 8.8.8.8 and 1.1.1.1 in round-robin fashion`.

## Review Notes
- All directive syntax is correct: `resolver <ip> [<ip>...] [ipv6=on|off] [valid=<time>];` is valid for both `http` and `stream` contexts. `ipv6=off` is supported (since 1.5.8) and `valid=<duration>` is the documented TTL override syntax.
- The note explaining that `proxy_pass` resolves at startup unless a variable is used is accurate for the HTTP context.
- The `stream` example uses a literal hostname (`db.internal:3306`) without a variable, which means the resolver in that block has limited effect — the address is resolved at configuration load time. This is technically not wrong, but a future revision could demonstrate variable-based or upstream-based runtime resolution to better illustrate the resolver's value in the `stream` context.
- `nslookup backend.internal 8.8.8.8` will only resolve internal hostnames if `backend.internal` is published in public DNS; for purely internal zones an internal resolver should be used. This is a minor caveat rather than an error.
