# Validation Summary: How to Deploy Caddy with Automatic HTTPS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy web server
- Caddyfile configuration
- Automatic HTTPS / ACME
- RHEL 9 / CentOS Stream 9
- systemd
- firewalld
- DNF / RPM packages

## Sources Consulted
- Caddy official installation documentation: https://caddyserver.com/docs/install
- Caddy official service documentation: https://caddyserver.com/docs/running
- Caddy official Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddyfile quick-start documentation: https://caddyserver.com/docs/quick-starts/caddyfile
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The original post used placeholder service paths such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>`, which would not work for Caddy. Replaced them with `/etc/caddy/Caddyfile`, the `caddy` systemd unit, HTTP/HTTPS firewalld services, and `rpm -q caddy`.
- The original post omitted the installation step even though the guide is about deployment on RHEL. Added the official Caddy COPR installation commands for CentOS/RHEL using `dnf-plugins-core`, `dnf copr enable @caddy/caddy`, and `dnf install caddy`.
- The original configuration guidance was generic and mentioned unrelated settings such as authentication options. Replaced it with a valid Caddyfile reverse proxy example and explained the concrete automatic HTTPS requirements: a public domain in the config, DNS pointing to the server, and externally reachable ports 80 and 443.
- The original post instructed restarting the service after configuration changes. Updated this to `systemctl reload caddy`, matching Caddy's service documentation for applying config changes without stopping the server.
- The original firewall example opened a placeholder port. Replaced it with named `http` and `https` firewalld services, which Red Hat documents as the recommended abstraction for common services.

## Review Notes
The corrected guide is technically valid for standard Caddy package deployments on RHEL-compatible systems. Future improvements could include optional SELinux notes for custom Caddy builds and guidance for static file hosting versus reverse proxy deployments.
