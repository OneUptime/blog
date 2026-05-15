# Validation Summary: How to Set Up Apache with mod_ssl and Let's Encrypt on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server
- mod_ssl
- firewalld
- Certbot
- Let's Encrypt
- systemd timers
- OpenSSL
- SELinux audit tooling

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies, Apache TLS configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat Blog: EPEL setup on RHEL 9 and CodeReady Builder requirement: https://www.redhat.com/it/blog/whats-epel-and-how-do-i-use-it
- Fedora EPEL package metadata for certbot on EPEL 9, including certbot-renew.timer: https://packages.fedoraproject.org/pkgs/certbot/certbot/epel-9.html
- Certbot User Guide, Apache plugin, certificate renewal, and automated renewal behavior: https://eff-certbot.readthedocs.io/en/stable/using.html
- Apache HTTP Server 2.4 mod_ssl documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Let's Encrypt certificate lifetime announcement and current 90-day default context: https://letsencrypt.org/2025/12/02/from-90-to-45.html

## Issues Found
- The EPEL setup command used `sudo dnf install -y epel-release`, which is not the documented RHEL 9 enablement path and can fail on a plain RHEL system. Updated it to enable CodeReady Builder with `subscription-manager` and install the official EPEL 9 release RPM URL.
- The renewal wording said Certbot only renews certificates within 30 days of expiry. That is accurate for the current EPEL 9 Certbot package line, but newer Certbot releases use a one-third-of-lifetime threshold. Updated the wording to make the version-specific behavior explicit.

## Review Notes
The Apache `mod_ssl`, `firewall-cmd`, Certbot Apache plugin, certificate file paths, systemd timer name for EPEL 9, SSL directives, and verification commands are technically consistent with the consulted documentation. Let's Encrypt has announced a future reduction of default certificate lifetimes, so the 90-day lifetime statement may need another review as that transition progresses.
