# Validation Summary: How to Obtain Free SSL Certificates with Let's Encrypt on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- Certbot
- Let's Encrypt
- Apache HTTP Server
- Nginx
- firewalld
- systemd timers
- OpenSSL
- SELinux

## Sources Consulted
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot manual page: https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- Fedora EPEL getting started documentation for RHEL 9: https://docs.fedoraproject.org/en-US/epel/getting-started/
- Fedora Packages entry for certbot on EPEL 9: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt certificate chains documentation: https://letsencrypt.org/certificates/
- Let's Encrypt announcement on shorter certificate lifetimes: https://letsencrypt.org/2026/02/24/rate-limits-45-day-certs.html

## Issues Found
- The EPEL setup command omitted the required CodeReady Builder repository enablement for RHEL 9. Added the `subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms` command before installing `epel-release`.
- The post described Certbot as the official Let's Encrypt client. Changed this to "widely used" to avoid implying that Let's Encrypt has a single official client.
- The Apache section stated that Certbot sets up an HTTP-to-HTTPS redirect. Changed this to say Certbot offers to set up the redirect, matching Certbot's interactive behavior.
- The renewal section described Let's Encrypt certificates as simply expiring after 90 days and Certbot renewal as fixed at 30 days before expiry. Updated it to note Let's Encrypt's transition toward shorter default lifetimes and Certbot's current less-than-one-third-lifetime renewal threshold.
- The private key permission check used `ls -la` on `/etc/letsencrypt/live/.../privkey.pem`, which normally shows the symlink rather than the actual private key file. Changed the command to resolve the symlink with `readlink -f` before checking permissions.

## Review Notes
The core Certbot commands for Apache, Nginx, standalone, webroot, certificate listing, dry-run renewal, firewalld services, and the OpenSSL certificate inspection command are technically valid. The chain explanation is simplified but accurate for the default ISRG Root X1 path; Let's Encrypt now has multiple active intermediates and alternate chains, so future updates could mention that intermediates vary over time.
