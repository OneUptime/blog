# Validation Summary: How to Set Up JupyterHub Multi-User Notebook Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF modules and packages
- Python virtual environments and pip
- Node.js and configurable-http-proxy
- JupyterHub and JupyterLab
- PAM authentication
- JupyterHub LocalProcessSpawner
- jupyterhub-idle-culler
- systemd
- firewalld
- Nginx reverse proxy
- Certbot and Let's Encrypt
- SELinux policy tools

## Sources Consulted
- JupyterHub Quickstart: https://jupyterhub.readthedocs.io/en/latest/tutorial/quickstart.html
- JupyterHub Configuration Reference: https://jupyterhub.readthedocs.io/en/stable/reference/config-reference.html
- JupyterHub External Services and idle culler configuration: https://jupyterhub.readthedocs.io/en/stable/tutorial/getting-started/services-basics.html
- JupyterHub reverse proxy guide: https://jupyterhub.readthedocs.io/en/4.x/howto/configuration/config-proxy.html
- Red Hat Enterprise Linux 9 DNF modular content documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 Nginx documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Certbot official Nginx instructions: https://certbot.eff.org/instructions?os=centosrhel8&tab=standard&ws=nginx
- Snapcraft Certbot on RHEL instructions: https://snapcraft.io/install/certbot/rhel

## Issues Found
- The idle-culler service was configured before the package was installed, which could prevent JupyterHub from starting. Moved installation into the component installation step and changed the later step to verify the installed command.
- The idle-culler service lacked the JupyterHub RBAC scopes required by current JupyterHub versions. Added `c.JupyterHub.load_roles` with `list:users`, `read:users:activity`, and `admin:servers`.
- The proxy auth token was described and configured as a file path, but `ConfigurableHTTPProxy.auth_token` expects a token value and defaults to `CONFIGPROXY_AUTH_TOKEN`. Removed the incorrect config line and set `CONFIGPROXY_AUTH_TOKEN` in the systemd service.
- The admin users listed in the config were not created as system users, which is incompatible with the PAM-based setup. Changed the admin user to `user1`, an account created by the tutorial.
- The `allowed_users` comment incorrectly said users could create their own accounts. Updated it to clarify that it restricts login to the listed system users.
- The post claimed LocalProcessSpawner-enforced CPU and memory limits. Current JupyterHub spawner docs expose those settings, but LocalProcessSpawner does not enforce resource isolation by itself. Updated the text to describe them as desired limits and noted spawners that can enforce limits.
- The Nginx proxy configuration only handled WebSocket headers in a narrow regex location. Updated it to use the documented `map` and WebSocket headers in the main proxy location with buffering disabled.
- The RHEL/Certbot installation used `dnf install certbot python3-certbot-nginx`, which is not the official Certbot-recommended installation path for RHEL. Updated it to install Certbot from the official snap package.
- The Nginx SSL configuration referenced Let's Encrypt certificate files before obtaining them. Updated the sequence to obtain the certificate before starting Nginx with the HTTPS server block.
- The Nginx reverse proxy section did not account for SELinux on RHEL. Added `semanage` and `setsebool` commands matching the JupyterHub reverse proxy guidance.
- The conclusion overstated per-user isolation and resource limits with LocalProcessSpawner. Updated it to describe the resulting notebook environment accurately and recommend SystemdSpawner, DockerSpawner, or KubeSpawner for enforceable limits and stronger isolation.

## Review Notes
The tutorial is technically relevant and salvageable. For production, the direct `8000/tcp` firewall rule should be avoided when JupyterHub is intended to be reachable only through Nginx; binding JupyterHub to `127.0.0.1:8000` is the cleaner production pattern.
