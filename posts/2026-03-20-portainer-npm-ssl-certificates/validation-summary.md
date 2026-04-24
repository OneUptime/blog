# Validation Summary: How to Set Up SSL Certificates for Portainer via Nginx Proxy Manager

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nginx Proxy Manager
- Portainer
- Let's Encrypt
- Certbot DNS plugins
- OpenSSL
- Docker
- TLS / SSL certificates

## Sources Consulted
- Nginx Proxy Manager guide: https://develop.nginxproxymanager.com/guide/
- Nginx Proxy Manager v2.13.0 release notes: https://github.com/NginxProxyManager/nginx-proxy-manager/releases/tag/v2.13.0
- Nginx Proxy Manager certificates UI source: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/frontend/src/pages/Certificates/TableWrapper.tsx
- Nginx Proxy Manager certificate backend source: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/internal/certificate.js
- Nginx Proxy Manager DNS plugin templates: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/certbot/dns-plugins.json
- Nginx Proxy Manager OpenAPI schema for tokens and certificate renewal: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/schema/swagger.json
- Nginx Proxy Manager Dockerfile: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/docker/Dockerfile
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Certbot Cloudflare DNS plugin documentation: https://github.com/certbot/certbot/blob/master/certbot-dns-cloudflare/certbot_dns_cloudflare/__init__.py
- Certbot Route53 DNS plugin documentation: https://github.com/certbot/certbot/blob/master/certbot-dns-route53/certbot_dns_route53/__init__.py
- Certbot DigitalOcean DNS plugin documentation: https://github.com/certbot/certbot/blob/master/certbot-dns-digitalocean/certbot_dns_digitalocean/__init__.py
- OpenSSL `req` documentation: https://docs.openssl.org/1.1.1/man1/req/

## Issues Found
- The certificate-request UI steps were outdated for current Nginx Proxy Manager releases. I updated the post to use the current `Add Certificate` flow with separate `Let's Encrypt via HTTP` and `Let's Encrypt via DNS` options.
- The post incorrectly told readers to enter a Let's Encrypt email address and accept the TOS inside the certificate request dialog. Current Nginx Proxy Manager releases removed those fields; the app now uses the email address on the logged-in user account. I removed the outdated fields and added the correct note.
- The Route53 credentials example was inaccurate. I replaced the invalid `dns_route53_region` example with the AWS credentials format that NPM's built-in Route53 plugin template and Certbot's Route53 plugin actually support.
- The SQLite monitoring command assumed the `sqlite3` CLI existed inside the NPM container. The official Dockerfile installs `jq` and `logrotate`, not the `sqlite3` shell utility. I replaced that command with a Node-based query that uses NPM's bundled SQLite library and scoped it to default SQLite deployments.
- The renewal example used `PORTAINER_URL` for NPM's admin API on port `81`. I renamed it to `NPM_URL` throughout the example to match the actual target service.
- The named-volume backup example only archived `/data`, which omitted `/etc/letsencrypt`. I corrected it to back up both persistent locations.
- One snippet in Step 4 was fenced as `sql` even though it was plain settings text. I corrected the fence to `text`.

## Review Notes
- The post is technically valid after the corrections above.
- The database query example applies to the default SQLite deployment path. If NPM is configured to use MySQL or PostgreSQL instead, readers need to query that external database rather than `/data/database.sqlite`.
- The API renewal example assumes the authenticated NPM user has permission to manage certificates and is not being prompted for a 2FA challenge during token creation.
