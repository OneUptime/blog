# Validation Summary: How to Configure Certbot Auto-Renewal for TLS Certificates on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Certbot
- Let's Encrypt TLS certificates
- systemd services and timers
- Apache httpd
- Nginx
- Bash
- OpenSSL CLI

## Sources Consulted
- Certbot User Guide: Renewing certificates and automated renewals - https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot installation documentation - https://eff-certbot.readthedocs.io/en/stable/install.html
- Fedora EPEL 9 certbot package file list - https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html
- Let's Encrypt FAQ: certificate lifetime and renewal guidance - https://letsencrypt.org/ca/docs/faq/
- Let's Encrypt certificate lifetime transition announcement - https://letsencrypt.org/2025/12/02/from-90-to-45.html
- systemd.timer manual - https://www.freedesktop.org/software/systemd/man/devel/systemd.timer.html

## Issues Found
- The per-domain hook example used `post_hook = systemctl reload httpd` while describing a reload after successful renewal. Certbot documentation recommends deploy hooks for commands that should run only after a certificate was actually renewed, so this was changed to `deploy_hook = systemctl reload httpd`.
- The standalone pre/post hook example wrote files under `/etc/letsencrypt/renewal-hooks/pre` and `/etc/letsencrypt/renewal-hooks/post` without ensuring those directories existed. Added `sudo mkdir -p /etc/letsencrypt/renewal-hooks/pre /etc/letsencrypt/renewal-hooks/post`.
- The monitoring script placed a comment before the shebang. Moved `#!/bin/bash` to the first line of the script block so the script works correctly when executed directly.
- The description of pre and post hooks was tightened to say post hooks run after each renewal attempt, whether successful or failed, matching Certbot's hook semantics.

## Review Notes
- The article is accurate for RHEL 9 Certbot packages from EPEL, which include `certbot-renew.service` and `certbot-renew.timer`.
- Certbot 4.0.0 and newer renews when less than one third of a certificate's lifetime remains. For current 90-day Let's Encrypt certificates, that is approximately 30 days.
- Let's Encrypt has announced future certificate lifetime reductions beginning after this post date; the 90-day statement remains accurate as of 2026-05-15 for the default classic profile, but this should be revisited before or after the 2027 default profile change.
