# Validation Summary: How to Install and Configure Caddy as a Web Server and Reverse Proxy on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Caddy web server
- Caddyfile configuration
- systemd
- firewalld
- HTTP reverse proxying
- Automatic HTTPS/TLS

## Sources Consulted
- Caddy install documentation: https://caddyserver.com/docs/install
- Caddy command-line documentation: https://caddyserver.com/docs/command-line
- Caddy `basic_auth` directive documentation: https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Caddy `root` directive documentation: https://caddyserver.com/docs/caddyfile/directives/root
- Caddy `file_server` directive documentation: https://caddyserver.com/docs/caddyfile/directives/file_server
- Caddy `reverse_proxy` directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- GitHub API latest Caddy release asset list: https://api.github.com/repos/caddyserver/caddy/releases/latest

## Issues Found
- The RHEL installation command used `dnf-command(copr)`, but Caddy's official RHEL/CentOS package instructions use `dnf-plugins-core` to provide COPR support. Updated the command to install `dnf-plugins-core`.
- The manual install command referenced `https://github.com/caddyserver/caddy/releases/latest/download/caddy_linux_amd64.tar.gz`, which redirects to a non-existent release asset. Updated it to download the current Linux amd64 static binary from Caddy's official download API and added `chmod +x`.
- The Caddyfile example used `basicauth`, which was renamed to `basic_auth` in Caddy v2.8.0. Updated the directive to the current name.

## Review Notes
- The package installation path is the best fit for the rest of the tutorial because it installs Caddy's systemd unit files. The static binary example installs only the binary; production systems should still use a service unit if they choose that path.
