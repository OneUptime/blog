# Validation Summary: How to Use Ansible to Configure Nginx Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Nginx
- Reverse proxy configuration
- Upstream load balancing
- SSL/TLS termination
- WebSocket proxying
- Proxy caching

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.yum` module documentation: https://docs.ansible.com/ansible/7/collections/ansible/builtin/yum_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible 2.10 `ansible.builtin` collection documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/index.html
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation, including `proxy_pass`, `proxy_set_header`, and caching directives: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx Open Source installation documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/

## Issues Found
- The prerequisites said Ansible 2.9+, but the examples use `ansible.builtin.*` fully qualified module names documented under the Ansible 2.10 `ansible.builtin` collection. Changed the prerequisite to Ansible 2.10+.
- The prerequisites claimed Ubuntu/Debian or RHEL/CentOS targets, but most examples use Debian-style `/etc/nginx/sites-available`, `/etc/nginx/sites-enabled`, and the `www-data` user/group. Clarified that the examples target Ubuntu/Debian and that RHEL/CentOS users should adapt paths and user/group values.
- The installation section said the playbook installed from the official repository for the latest stable version, but the playbook only installs `nginx` from whatever package repositories are already configured and uses `state: present`. Updated the wording and code comment to say "configured package repositories."
- The SSL example used `listen 443 ssl http2;`. Current Nginx documentation marks the `http2` listen parameter as deprecated in favor of the separate `http2` directive. Since HTTP/2 was not required for the example, changed it to `listen 443 ssl;`.

## Review Notes
The Ansible and Nginx snippets are otherwise technically sound for a Debian/Ubuntu Nginx layout. For production use, the examples could be improved later by adding `nginx -t` validation before reload handlers and by parameterizing cache server names and backend URLs, but those are enhancements rather than correctness fixes.
