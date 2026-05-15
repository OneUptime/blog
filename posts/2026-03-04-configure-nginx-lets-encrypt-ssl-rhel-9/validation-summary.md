# Validation Summary: How to Configure Nginx with Let's Encrypt SSL on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- Nginx
- Let's Encrypt
- Certbot
- TLS/SSL
- systemd timers
- OpenSSL

## Sources Consulted
- Certbot instructions for Nginx on RHEL/CentOS: https://certbot.eff.org/instructions?os=centosrhel8&tab=standard&ws=nginx
- Certbot user guide, Nginx plugin and renewal behavior: https://eff-certbot.readthedocs.io/en/stable/using.html
- Red Hat EPEL setup guidance for RHEL 9: https://www.redhat.com/en/blog/whats-epel-and-how-do-i-use-it
- Fedora package information for certbot on EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html
- Fedora package information for python3-certbot-nginx on EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/python3-certbot-nginx/epel-9.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- NGINX ngx_http_ssl_module directive reference: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Let's Encrypt certificate lifetime and renewal guidance: https://letsencrypt.org/2026/02/24/rate-limits-45-day-certs

## Issues Found
- The EPEL enablement command used `sudo dnf install -y epel-release`, which is not the documented setup path for a subscribed RHEL 9 system. Updated the command to enable CodeReady Builder and install the EPEL release RPM from Fedora's official EPEL location.
- The OCSP stapling verification snippet enabled `ssl_stapling_verify on` without configuring `ssl_trusted_certificate`. Added `ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;` because NGINX requires trusted issuer/root/intermediate certificates to verify stapled OCSP responses.
- The summary stated that Certbot handles automatic renewal every 60 days. Updated this to say renewal happens when certificates are near expiry, which matches Certbot's current renewal behavior and avoids becoming inaccurate as Let's Encrypt certificate lifetimes change.

## Review Notes
The Certbot Nginx plugin commands, domain flags, dry-run renewal command, Nginx `listen 443 ssl`, certificate file paths, TLS protocol settings, session cache settings, HSTS header syntax, and OpenSSL certificate inspection command are technically valid. The article uses the EPEL package approach rather than Certbot's currently recommended snap installation path; this is still workable for RHEL 9 because EPEL 9 provides `certbot`, `python3-certbot-nginx`, and `certbot-renew.timer`.
