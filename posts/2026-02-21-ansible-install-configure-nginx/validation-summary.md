# Validation Summary: How to Use Ansible to Install and Configure Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Nginx
- Ubuntu APT repositories
- Reverse proxy configuration
- TLS/SSL
- Let's Encrypt Certbot
- Mermaid diagrams

## Sources Consulted
- Ansible ansible.builtin apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible 2.10 ansible.builtin collection documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/index.html
- Ansible ansible.builtin systemd_service module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/systemd_service_module.html
- Nginx official Linux packages documentation: https://nginx.org/en/linux_packages.html
- Nginx ngx_http_limit_req_module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx HTTP/2 configuration guidance: https://docs.nginx.com/nginx/deployment-guides/load-balance-third-party/node-js/
- Certbot documentation for the Nginx plugin and certonly mode: https://eff-certbot.readthedocs.io/en/stable/

## Issues Found
- The prerequisites listed Ansible 2.9+, but the playbooks use fully qualified collection names such as `ansible.builtin.apt`, which are the Ansible 2.10+ collection style. Updated the prerequisite to Ansible 2.10+.
- The prerequisites claimed the examples applied directly to Ubuntu 20.04+ or RHEL 8+, but the playbooks use Ubuntu/Debian APT modules. Clarified that the examples target Ubuntu and that RHEL users should use Nginx's yum repository instructions.
- The install playbook used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` workflow. Replaced it with a downloaded keyring file and a `signed-by` APT repository entry.
- The official Nginx Ubuntu repository setup recommends `ubuntu-keyring` and repository pinning to prefer nginx.org packages. Added `ubuntu-keyring` and a `/etc/apt/preferences.d/99nginx` task.
- The reverse proxy template used `listen 443 ssl http2;`, which is deprecated in current Nginx in favor of `listen 443 ssl;` plus `http2 on;`. Updated the snippet accordingly.
- The `/health` location attempted to disable inherited rate limiting with `limit_req off;`, which is not valid `limit_req` syntax. Moved rate limiting into the proxied locations that need it and made `/health` an exact-match location with no `limit_req`.
- The WebSocket proxy headers always sent `Connection: upgrade`, even for non-upgrade requests. Added a `map` in the main Nginx config and changed the proxy header to use `$connection_upgrade`.
- The configuration flow deployed HTTPS site configuration before obtaining certificates, which can make `nginx -t` fail because the configured certificate files do not exist yet. Updated the flow so certificates are obtained before deploying HTTPS site configurations.
- The verification playbook used the `systemd` module with only `name`, but the module requires an action such as `state`, `enabled`, `masked`, `daemon_reload`, or `daemon_reexec`. Replaced that read-only status check with `systemctl is-active nginx`.
- The production tip said there is no downside to HTTP/2 for modern clients. Reworded it to avoid an absolute claim while preserving the recommendation.

## Review Notes
The Certbot example uses the distro `certbot` and `python3-certbot-nginx` packages, which is valid on Ubuntu but may lag behind upstream Certbot releases depending on the Ubuntu version. The post is now technically correct for the stated Ubuntu/Ansible/Nginx workflow.
