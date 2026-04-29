# Validation Summary: How to Set Up Let's Encrypt for Services via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Let's Encrypt
- Traefik
- Nginx Proxy Manager
- Certbot
- Nginx
- Docker Compose
- Cloudflare DNS challenge

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Traefik Docker Compose ACME HTTP challenge guide: https://doc.traefik.io/traefik/v3.4/user-guides/docker-compose/acme-http/
- Traefik ACME / Let's Encrypt reference: https://doc.traefik.io/traefik/v3.3/https/acme/
- Nginx Proxy Manager setup instructions: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager advanced configuration: https://develop.nginxproxymanager.com/advanced-config/
- Nginx Proxy Manager official releases: https://github.com/NginxProxyManager/nginx-proxy-manager/releases
- Certbot user guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot Docker installation notes: https://eff-certbot.readthedocs.io/en/stable/install.html
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/

## Issues Found
- The Traefik and Nginx Proxy Manager Compose examples used `version: "3.8"`. I removed those lines because the current Compose Specification treats the top-level `version` field as obsolete and Compose now validates against the latest schema automatically.
- The Nginx Proxy Manager login step said to use default credentials `admin@example.com` / `changeme`. I replaced that with initial admin setup guidance because current Nginx Proxy Manager releases use first-run setup behavior instead of relying on those hard-coded credentials.
- The Certbot section implied that the shown container loop handled certificate issuance. I clarified that `certbot renew` only renews previously obtained certificates, updated the renewal comment accordingly, and added the required initial `certbot certonly --webroot` step plus the Nginx `/.well-known/acme-challenge/` requirement.

## Review Notes
- The Traefik ACME HTTP challenge flags and label-based routing were verified against the current Traefik v3 documentation, including compatibility between HTTP-to-HTTPS redirection and the HTTP-01 challenge.
- The wildcard certificate section is technically correct: Let's Encrypt requires DNS-01 for wildcard issuance.
- The Cloudflare DNS challenge example uses `CF_API_EMAIL` and `CF_API_KEY`, which Traefik still documents as supported. `CF_DNS_API_TOKEN` is also supported if a narrower-scoped credential is preferred.
- The Traefik example keeps `--api.insecure=true`. That is functional, but if port `8080` is later published it would expose the dashboard/API without authentication.
