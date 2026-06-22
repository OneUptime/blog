# Validation Summary: Decentralize the Internet: Open Source Alternatives to Cloudflare Products

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cloudflare
- Varnish Cache
- Nginx
- HAProxy
- CrowdSec
- fail2ban
- PowerDNS GeoIP backend
- BIND 9
- Let's Encrypt
- Caddy
- Certbot
- ModSecurity
- Coraza WAF
- Traefik
- Deno Deploy
- Fastly Compute
- Fly.io
- OpenFaaS
- Cloudflare Workers / workerd

## Sources Consulted
- Varnish Cache VCL and request/response object documentation: https://varnish-cache.readthedocs.io/users-guide/vcl-variables.html
- NGINX proxy cache documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- HAProxy stick-table documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- CrowdSec cscli collections documentation: https://docs.crowdsec.net/docs/cscli/cscli_collections_install/
- PowerDNS GeoIP backend documentation: https://doc.powerdns.com/authoritative/backends/geoip.html
- BIND 9 configuration and zone file documentation: https://bind9.readthedocs.io/en/latest/chapter3.html
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Caddy reverse_proxy documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy encode and log documentation: https://caddyserver.com/docs/caddyfile/directives/encode and https://caddyserver.com/docs/caddyfile/directives/log
- Coraza Caddy plugin documentation: https://github.com/corazawaf/coraza-caddy
- Coraza SecLang directives documentation: https://www.coraza.io/docs/seclang/directives/
- ModSecurity-nginx connector documentation: https://github.com/owasp-modsecurity/ModSecurity-nginx
- Traefik Docker label and ACME documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/ and https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- OpenFaaS autoscaling and Function CRD documentation: https://docs.openfaas.com/architecture/autoscaling/ and https://docs.openfaas.com/openfaas-pro/function-crd/
- Deno Deploy and Deno runtime documentation: https://docs.deno.com/deploy/ and https://docs.deno.com/runtime/
- Fastly Compute documentation: https://docs.fastly.com/products/compute
- Fly.io documentation: https://fly.io/docs/
- Cloudflare workerd announcement and Workers documentation: https://blog.cloudflare.com/workerd-open-source-workers-runtime/ and https://developers.cloudflare.com/workers/
- W3Techs Cloudflare usage statistics: https://w3techs.com/technologies/details/cn-cloudflare
- Cloudflare network capacity information: https://blog.cloudflare.com/500-tbps-of-capacity/

## Issues Found
- Updated Cloudflare DDoS capacity from "100+ Tbps" to "500+ Tbps" to match Cloudflare's 2026 published network capacity.
- Fixed the HAProxy rate-limit response header example. The previous `X-RateLimit-Remaining` expression subtracted 100 from the current request rate, so it did not represent remaining quota. It now reports `X-RateLimit-Used`.
- Replaced the PowerDNS GeoIP YAML example. The previous snippet used unsupported per-record `filters` and a top-level `services.geoip.database` structure. It now follows the documented GeoIP backend schema with `records`, `services`, `%mp`, `mapping_lookup_formats`, and `custom_mapping`.
- Fixed the Coraza Caddy example so `load_owasp_crs` is paired with the required CRS include directives.
- Clarified the ModSecurity Nginx module requirement to refer to the ModSecurity-nginx connector or a package that provides it.
- Fixed the Traefik labels and comments by making TLS explicit and changing the misleading "automatic HTTPS redirect" comment to describe the actual HTTPS router behavior.
- Corrected the edge compute comparison table: Deno Deploy now supports self-hosted infrastructure according to current Deno docs, and Cloudflare Workers uses the open-source workerd runtime even though the managed Workers platform itself is not self-hosted.
- Added the OpenFaaS Function CRD/operator caveat for the Kubernetes custom resource example.

## Review Notes
- The post is technically relevant and includes substantial configuration examples, so it was reviewed as a technical guide.
- Some examples remain intentionally illustrative and require environment-specific values such as real domains, certificate paths, DNS provider credentials, backend service ports, firewall backend choices, and provider-specific package names.
- For large DDoS mitigation and global edge coverage, the post correctly notes that self-hosting cannot practically replicate Cloudflare-scale capacity for most teams.
