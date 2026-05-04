# Validation Summary: How to Configure Harbor Container Registry with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Harbor (open-source container registry, v2.9.0)
- Docker / Docker Compose
- Nginx (IPv6 proxy configuration)
- OpenSSL (certificate generation with IPv6 SAN)
- ip6tables (IPv6 firewall rules)
- IPv6 networking

## Sources Consulted
- Harbor official documentation: https://goharbor.io/docs/
- Harbor installation guide: https://goharbor.io/docs/2.9.0/install-config/
- Harbor releases on GitHub: https://github.com/goharbor/harbor/releases
- Harbor harbor.yml configuration reference: https://goharbor.io/docs/2.9.0/install-config/configure-yml-file/
- Nginx IPv6 listen directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- OpenSSL `req` command: https://www.openssl.org/docs/man3.0/man1/openssl-req.html
- iptables-persistent / netfilter-persistent (Debian/Ubuntu): default save path `/etc/iptables/rules.v6`
- Docker `docker login`, `docker tag`, `docker push`, `docker pull` reference docs
- Docker insecure/self-signed certificate setup: `/etc/docker/certs.d/<registry>/ca.crt`

## Issues Found
1. **Incorrect ip6tables save path**: The post used `/etc/ip6tables/rules.v6` for saving IPv6 firewall rules. The standard path used by the `iptables-persistent`/`netfilter-persistent` package on Debian/Ubuntu is `/etc/iptables/rules.v6` (the same directory holds both `rules.v4` and `rules.v6`). Updated to the correct path.

## Review Notes
- Harbor v2.9.0 is a real release (September 2023). The download URL pattern is correct.
- The `harbor.yml` configuration fields (`hostname`, `http.port`, `https.port`, `https.certificate`, `https.private_key`, `harbor_admin_password`, `database.password`, `data_volume`) are all valid. Note that the actual default `data_volume` is `/data`, but `/data/harbor` is also valid as a custom path.
- The OpenSSL config for generating an x509 certificate with an IPv6 `IP.1` SAN is syntactically correct; OpenSSL accepts IPv6 literals in `subjectAltName` `IP:` entries.
- The Nginx configuration with `listen [::]:80;` and `listen [::]:443 ssl http2;` is the standard dual-stack pattern.
- `docker compose ps` (v2 plugin syntax) and `docker-compose ps` (v1 standalone) are both valid; Harbor's `install.sh` works with either.
- The Docker self-signed cert path `/etc/docker/certs.d/<registry>/ca.crt` is correct per Docker's documentation.
- Note: the post overlaps with Harbor's own internal Nginx templating (`common/templates/nginx/nginx.http.conf`); in production, edits typically need to be made to the template before re-running `prepare`/`install.sh`, as the generated `common/config/nginx/nginx.conf` is regenerated. The post hints at this but readers may benefit from explicitly running `./prepare` after template edits in future revisions.
