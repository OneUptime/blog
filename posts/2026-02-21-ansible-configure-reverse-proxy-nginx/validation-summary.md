# Validation Summary: How to Use Ansible to Configure Reverse Proxy with Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nginx
- Reverse proxy configuration
- WebSocket proxying
- HTTP caching
- Rate limiting
- Systemd service management

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx ngx_http_upstream_module keepalive documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html

## Issues Found
- The per-site template defined an upstream block with `keepalive 32`, but the `proxy_pass` directives pointed directly at `{{ item.backend }}`. This bypassed the named upstream, so the upstream keepalive configuration would not be used. I changed the main, `/ws`, and `/socket.io` proxy locations to use `proxy_pass http://{{ item.name }}_backend;`, matching the documented Nginx upstream usage pattern.
- The health check location used `add_header Content-Type text/plain;` after `return`. I changed this to `default_type text/plain;`, which is the appropriate Nginx directive for setting the content type of the body returned by that location.

## Review Notes
- The examples use short Ansible module names such as `apt`, `file`, `template`, `systemd`, `command`, and `uri`. These remain valid because the modules are in `ansible.builtin`, though Ansible documentation recommends fully qualified collection names for clarity.
- I could not run local `nginx -t` or `ansible-playbook --version` checks because neither `nginx` nor `ansible-playbook` is installed in this environment. The review was performed against official documentation.
