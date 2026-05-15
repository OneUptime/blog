# Validation Summary: How to Install and Configure Caddy Web Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Caddy web server
- DNF and COPR repositories
- systemd
- firewalld
- SELinux

## Sources Consulted
- Caddy Install documentation: https://caddyserver.com/docs/install
- Caddy Keep Caddy Running documentation: https://caddyserver.com/docs/running
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation commands used generic placeholders instead of the official Caddy package installation flow for RHEL/CentOS. Replaced them with `dnf install dnf-plugins-core`, `dnf copr enable @caddy/caddy`, and `dnf install caddy`, matching Caddy's official Fedora/RedHat/CentOS package documentation.
- The configuration file path used a generic placeholder. Replaced it with `/etc/caddy/Caddyfile`, which is the default Caddyfile path used by Caddy's official service documentation.
- The service commands used generic placeholders. Replaced them with the actual `caddy` systemd service name.
- The post instructed restarting the service after configuration changes. Replaced this with `systemctl reload caddy`, which Caddy recommends for applying configuration changes without downtime.
- The firewall example used a generic port placeholder. Replaced it with the standard `http` and `https` firewalld services required for Caddy's normal HTTP/HTTPS traffic and automatic certificate issuance.
- The verification and troubleshooting commands used generic placeholders. Replaced them with Caddy-specific `journalctl`, `systemctl`, and RPM query commands.

## Review Notes
The guide now contains technically valid Caddy/RHEL commands, but it remains a minimal setup guide. A future improvement could include a concrete example Caddyfile for serving static files or reverse proxying an application, plus a note that public DNS records and externally reachable ports 80 and 443 are required for public ACME certificates.
