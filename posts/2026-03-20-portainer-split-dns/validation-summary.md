# Validation Summary: How to Set Up Split DNS for Portainer Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- DNS
- Split-horizon DNS
- BIND 9
- Pi-hole
- Cloudflare DNS
- NGINX
- Docker Compose
- Docker Engine

## Sources Consulted
- Amazon Route 53 Developer Guide: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- ISC BIND 9 Configuration Reference: https://isc-projects.gitlab-pages.isc.org/bind9/reference.html
- Pi-hole API documentation: https://docs.pi-hole.net/api/
- Pi-hole FTL configuration reference: https://docs.pi-hole.net/ftldns/configfile/
- Cloudflare DNS record management: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/
- Cloudflare DNS record API: https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/
- Cloudflare proxy status reference: https://developers.cloudflare.com/dns/proxy-status/
- NGINX HTTPS server configuration: https://nginx.org/en/docs/http/configuring_https_servers.html
- NGINX SSL module reference: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Portainer reverse proxy documentation: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer port reference: https://docs.portainer.io/2.33-lts/faqs/installing/how-do-i-change-the-port-that-portainer-runs-on

## Issues Found
- The BIND example created an internal zone for `internal.example.com`, which would resolve `portainer.internal.example.com` instead of the same public hostname used elsewhere in the post. I changed the zone to `example.com`, updated the SOA/NS records to match, and added `mkdir -p /etc/bind/zones` so the example works on a default Debian/Ubuntu layout.
- The Pi-hole example used an unsupported API path and authentication pattern. I replaced it with Pi-hole's documented `pihole-FTL --config dns.hosts` method and kept the web UI instructions as the primary option.
- The Cloudflare example set `"proxied": true`, which would cause DNS lookups to return Cloudflare proxy IPs instead of the origin `PUBLIC_IP` described by the post's architecture and test commands. I changed it to `"proxied": false` so the example matches the stated split-DNS behavior.
- The second NGINX `server` block listened on `443 ssl` but did not define a certificate and key. I added `ssl_certificate` and `ssl_certificate_key` entries so the configuration is valid.
- The Compose snippet used the obsolete top-level `version` field and mixed in `api.internal`, which conflicted with the post's same-domain split-DNS explanation. I removed `version` and updated the example to use `api.example.com`.
- The Docker daemon example set `dns-search` to `internal.example.com`, which conflicted with split DNS using the same domain internally and externally. I changed it to `example.com`.

## Review Notes
- The post is technically accurate after the fixes, but most container-specific examples are Docker-focused rather than Kubernetes-focused. If this post is later expanded for Kubernetes users, it should add cluster DNS and ingress-specific guidance rather than implying the Docker examples apply unchanged.
- With same-zone split DNS, the internal authoritative zone must contain the records internal clients need. Missing names in an internal authoritative zone do not automatically fall back to public DNS.
