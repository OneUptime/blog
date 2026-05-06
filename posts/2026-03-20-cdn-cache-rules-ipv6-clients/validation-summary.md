# Validation Summary: How to Configure CDN Cache Rules for IPv6 Clients

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- CDN caching
- Cloudflare Workers
- Cloudflare Cache Rules
- Fastly VCL
- Nginx reverse-proxy caching
- Prometheus / PromQL

## Sources Consulted
- Cloudflare Workers Cache API: https://developers.cloudflare.com/workers/examples/cache-api/
- Cloudflare Workers cache behavior: https://developers.cloudflare.com/workers/reference/how-the-cache-works/
- Cloudflare Cache Rules overview: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cloudflare Cache Keys: https://developers.cloudflare.com/cache/how-to/cache-keys/
- Cloudflare Page Rules migration guide: https://developers.cloudflare.com/rules/reference/page-rules-migration/
- Cloudflare purge cache key resources: https://developers.cloudflare.com/cache/how-to/purge-cache/purge-cache-key/
- Fastly `vcl_hash`: https://www.fastly.com/documentation/reference/vcl/subroutines/hash/
- Fastly geolocation variables: https://www.fastly.com/documentation/reference/vcl/variables/geolocation/
- Fastly cache-key manipulation: https://www.fastly.com/documentation/guides/full-site-delivery/custom-vcl/manipulating-the-cache-key/
- Fastly purge behavior: https://www.fastly.com/documentation/guides/concepts/edge-state/cache/purging/
- nginx proxy cache directives: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html
- nginx `add_header` directive: https://nginx.org/en/docs/http/ngx_http_headers_module.html

## Issues Found
- The Cloudflare Worker example was broken. It used service-worker style syntax, referenced `event.waitUntil` outside its scope, implied header-based cache-key behavior that does not match Cloudflare’s Cache API semantics, and returned the unmodified response after caching a different one. I replaced it with a valid module Worker example using `ctx.waitUntil`, a URL-based cache key, and `s-maxage`.
- The post recommended Cloudflare Page Rules in a cache-rules guide. Cloudflare’s current documentation centers Cache Rules and provides a migration path from Page Rules, so I replaced the Page Rules example with an equivalent Cache Rule example.
- The Nginx shared-cache example only listened on IPv6 even though the text said both IPv4 and IPv6 clients would share the same cached content. I added the IPv4 listener and kept the cache key free of client-IP data.
- The Nginx IPv6-specific cache-key example used `$http_x_client_ip_version`, which refers to an incoming client header rather than the `$ip_version` variable set in the snippet. I corrected the cache key to use `$ip_version`.
- The Fastly geolocation example used a truthy check for `client.geo.country_code`, but Fastly documents absent geolocation values as `?`. I updated the example to guard against that value explicitly.
- The purge guidance was too broad. Cloudflare custom cache-key variants require corresponding headers in purge requests, and Fastly URL purges become more nuanced when `vcl_hash` adds extra inputs. I tightened the wording to reflect those constraints.

## Review Notes
- Cloudflare cache-key user features such as `Geo` are Enterprise-only; the post now notes that explicitly.
- The PromQL example is structurally valid, but it assumes your CDN or observability pipeline exports an `ip_version` label.
- Fastly also exposes `req.is_ipv6` in `vcl_hash`, but the corrected post does not require IP-family-specific hashing unless the application truly serves different content by IP family.
