# Validation Summary: How to Configure Nginx as a Reverse Proxy for a Node.js API on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Nginx
- Node.js
- systemd
- firewalld
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Setting up and configuring NGINX: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx
- Red Hat Enterprise Linux 8 documentation: Configuring NGINX as a reverse proxy for HTTP traffic: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/deploying_different_types_of_servers/deploying-different-types-of-servers.pdf
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, Node.js module/package installation examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 10 documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld
- NGINX official documentation: ngx_http_proxy_module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX official documentation: Command-line parameters: https://nginx.org/en/docs/switches.html

## Issues Found
- The original post used placeholder package and service commands such as `sudo dnf install -y <package-name>`, `rpm -qi <package-name>`, `sudo systemctl enable --now <service>`, and `sudo <service> --test`. These were replaced with concrete RHEL commands for installing and verifying `nginx`, `nodejs`, `npm`, `firewalld`, and SELinux tooling.
- The original post did not include an Nginx reverse proxy configuration for a Node.js API. Added a valid `/etc/nginx/conf.d/node-api.conf` server block using `proxy_pass` and standard forwarded headers.
- The original post did not define how the Node.js API should run as a service. Added a minimal systemd unit for a Node.js API running from `/opt/node-api/server.js` as a dedicated non-root user.
- The original post omitted the SELinux setting needed for Nginx reverse proxy connections on RHEL. Added `setsebool -P httpd_can_network_connect 1`, which Red Hat documents for Nginx reverse proxy forwarding.
- The firewall example used `<service>`, which is not a valid firewalld service name for this setup. Replaced it with `http` and `https`, and added a command to enable and start `firewalld`.
- The verification and troubleshooting commands used generic placeholders. Replaced them with `nginx -t`, `curl`, `journalctl -u node-api`, and `journalctl -u nginx` commands.
- The performance monitoring example used a placeholder process name. Replaced it with commands targeting the `node-api`, `nginx`, `node`, and `nginx` processes.

## Review Notes
The post is now technically valid as a general RHEL reverse-proxy guide, but it still assumes that the user's Node.js API already exists at `/opt/node-api/server.js` and listens on `127.0.0.1:3000`. Future improvements could add a small sample Node.js API and TLS certificate setup, but those additions were outside this validation pass.
