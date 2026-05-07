# Validation Summary: How to Configure Apache to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- Apache configuration directives (`Listen`, `<VirtualHost>`, `Require ip`)
- Linux networking and diagnostic tools (`ss`, `lsof`)
- systemd service management

## Sources Consulted
- Apache HTTP Server 2.4 docs, "Binding to Addresses and Ports": https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4 docs, `apachectl`: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Apache HTTP Server 2.4 docs, `<VirtualHost>`: https://httpd.apache.org/docs/current/en/mod/core.html#virtualhost
- Apache HTTP Server 2.4 docs, `mod_authz_host` / `Require ip`: https://httpd.apache.org/docs/current/en/mod/mod_authz_host.html
- Apache HTTP Server 2.4 docs, Virtual Host documentation: https://httpd.apache.org/docs/current/vhosts/
- Ubuntu Server documentation, Apache2 install/config layout: https://ubuntu.com/server/docs/how-to/web-services/install-apache2/
- Ubuntu Server documentation, Apache2 settings and `Listen`: https://ubuntu.com/server/docs/how-to/web-services/configure-apache2-settings/
- Red Hat Enterprise Linux 9 documentation, Apache configuration files and service management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Debian man page for `apache2ctl`: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- Local CLI help output checked for `ss`, `lsof`, and `systemctl`

## Issues Found
- The introduction stated that Apache "listens on all network interfaces (`0.0.0.0`)" by default. I corrected this to the more accurate behavior documented by Apache: when only a port such as `Listen 80` is configured, Apache listens on that port on all interfaces.
- The post described `ports.conf` and `httpd.conf` as the fixed location of `Listen` directives. I corrected this to say the directive is commonly managed there, because distro packaging can also place listeners in included files.
- The single-IP example only told readers to remove `Listen 80` before adding IP-specific listeners on both ports `80` and `443`. I changed this to remove existing wildcard `Listen` directives for the same ports, preventing overlapping `Listen` directives that Apache documents as a fatal startup error.
- The restart section recommended a graceful reload after changing `Listen` bindings. I replaced that guidance with restart and stop/start guidance, because Apache documents `Listen` changes as a special case where conflicting old and new bindings can require stopping and starting the server.
- The syntax-test and restart examples were Debian-specific in places even though the post discusses both Debian/Ubuntu and RHEL/CentOS. I added the corresponding generic or RHEL-friendly command forms where needed.
- The conclusion described this as a one-line `ports.conf` change. I corrected it to a more accurate summary that applies across distro layouts and ports.

## Review Notes
- The `Listen 203.0.113.10:443` example only controls socket binding. Serving HTTPS on that address still requires a valid TLS virtual host and certificate configuration, which is outside this post's scope.
- On IPv6-capable systems, Apache may also use IPv6 listeners unless you explicitly bind only IPv4 addresses, as shown in the corrected examples.
