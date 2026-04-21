# Validation Summary: How to Generate and Install an SSL/TLS Certificate Using Let's Encrypt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Let's Encrypt
- ACME
- Certbot
- Nginx
- Apache
- DNS-01 and HTTP-01 validation
- Cloudflare DNS plugin for Certbot
- OpenSSL
- systemd timers and cron-based renewal

## Sources Consulted
- Let's Encrypt FAQ: https://letsencrypt.org/docs/faq/
- Let's Encrypt Getting Started: https://letsencrypt.org/getting-started/
- Let's Encrypt ACME client implementations: https://letsencrypt.org/docs/client-options/
- Let's Encrypt Expiration Emails documentation: https://letsencrypt.org/docs/expiration-emails/
- Let's Encrypt certificate lifetime announcement: https://letsencrypt.org/2025/12/02/from-90-to-45.html
- Certbot instructions for Nginx on Linux snap: https://certbot.eff.org/instructions?os=snap&ws=nginx
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/latest/using.html
- certbot-dns-cloudflare documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- RFC 8555, Automatic Certificate Management Environment (ACME): https://www.rfc-editor.org/rfc/rfc8555
- Nginx HTTPS configuration documentation: https://nginx.org/en/docs/http/configuring_https_servers.html
- Nginx SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- OpenSSL x509 command documentation: https://docs.openssl.org/3.5/man1/openssl-x509/

## Issues Found
- The post described Certbot as "the official ACME client." Let's Encrypt currently describes Certbot as the recommended ACME client and lists ACME clients as third-party software, so the wording was changed to "the recommended ACME client."
- The post said Let's Encrypt issues 90-day certificates without qualification. Let's Encrypt's current FAQ says default certificates are 90 days, with optional short-lived certificates available, so the wording was changed to "default 90-day" and "default certificates currently expire after 90 days."
- The snap install command linked `/snap/bin/certbot` into `/usr/bin/certbot`. Certbot's current snap instructions use `/usr/local/bin/certbot`, so the symlink path was corrected.
- The Nginx interactive-mode notes said the email address is for expiry notifications. Let's Encrypt ended its expiration email service in June 2025, so that note was changed to account contact wording.
- The Nginx interactive-mode notes said to choose option 2 for HTTPS redirect. Current Certbot help documents HTTP-to-HTTPS redirect as enabled by default for install/run, so the note was updated to mention `--no-redirect`.
- The Nginx flow said Certbot creates a temporary ACME challenge file. Certbot's Nginx plugin uses HTTP-01 on port 80 and may make temporary Nginx configuration changes; the wording was changed to "Complete an ACME HTTP-01 challenge on port 80."
- The post said Certbot sets up automatic renewal during issuance. Certbot packages provide the scheduler, while issuance saves renewal configuration, so the wording was corrected.
- The wildcard certificate example used `--manual` without warning that manual certificates do not auto-renew unless hooks automate the validation steps. A note was added to the command block.
- The Cloudflare DNS plugin example installed the apt plugin even though the post recommends snap earlier. The example was updated with the snap plugin installation flow, plus an apt-based alternative comment.
- The Cloudflare DNS plugin command referenced a credentials file without noting that it must exist and be protected. A short comment was added to create the credentials file and restrict it with `chmod 600`.
- The OpenSSL command comment said "Check days remaining" even though `openssl x509 -enddate -noout` prints the certificate expiration date. The comment was corrected to "Check expiration date."
- The conclusion promised "zero ongoing manual effort." This was too broad for manual challenge workflows and renewal failure scenarios, so it was changed to "minimal ongoing manual effort when renewals are configured correctly."

## Review Notes
Let's Encrypt has announced a future reduction in default certificate lifetime: the opt-in `tlsserver` ACME profile changes on May 13, 2026, the default classic profile changes to 64 days on February 10, 2027, and it changes to 45 days on February 16, 2028. The post is accurate as of 2026-04-21 after the edits, but the 90-day language should be revisited before the 2027 default-profile change.
