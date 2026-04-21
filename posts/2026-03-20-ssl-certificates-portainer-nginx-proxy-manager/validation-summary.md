# Validation Summary: How to Set Up SSL Certificates for Portainer via Nginx Proxy Manager (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Nginx Proxy Manager
- Let's Encrypt
- ACME HTTP-01 and DNS-01 challenges
- Certbot
- certbot-dns-cloudflare
- OpenSSL
- Docker volumes

## Sources Consulted
- Nginx Proxy Manager Guide: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager Setup Instructions: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager certificate source: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/v2.14.0/backend/internal/certificate.js
- Nginx Proxy Manager config source: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/v2.14.0/backend/lib/config.js
- Nginx Proxy Manager DNS plugin metadata: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/v2.14.0/global/certbot-dns-plugins.json
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt Rate Limits: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt Expiration Emails: https://letsencrypt.org/docs/expiration-emails/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- OpenSSL req documentation: https://docs.openssl.org/3.1/man1/openssl-req/
- OpenSSL x509v3_config documentation: https://docs.openssl.org/3.4/man5/x509v3_config/
- RFC 9525, Service Identity in TLS: https://www.rfc-editor.org/rfc/rfc9525
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/

## Issues Found
- The post described the Let's Encrypt email field as being for expiration notices. Let's Encrypt ended expiration emails in 2025, so this was changed to "your ACME account contact email."
- The self-signed OpenSSL command used the deprecated OpenSSL 3 `-nodes` option and only set a Common Name. Modern TLS service identity should use a `subjectAltName`, so the command now uses `-noenc` and adds `subjectAltName=DNS:portainer.internal.lan`.
- The renewal section called `certbot renew --dry-run` a manual renewal trigger. A dry run tests renewal but does not renew a certificate, so the comment was changed to "Manual renewal test" and the command was aligned with NPM's Certbot config, work, and log paths.
- The backup section said NPM stores certificates in its data volume and backed up only one Let's Encrypt volume. NPM stores Let's Encrypt material under `/etc/letsencrypt`, while the database and custom certificates live under `/data`, so the text and backup command now cover both locations.
- The troubleshooting section summarized Let's Encrypt failures as "max 5 failed per hour" and referenced a staging checkbox. The rate-limit wording was corrected to "5 authorization failures per identifier per account per hour," and the staging guidance was changed to NPM's `LE_STAGING=true` environment variable.

## Review Notes
The Docker CLI was not installed in the local review environment, so the Docker command was checked against Docker's official volume syntax and Nginx Proxy Manager's documented mount points rather than executed locally.
