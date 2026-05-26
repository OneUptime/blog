# Validation Summary: How to Use Ansible to Set Up WebSocket Proxy with Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles, tasks, handlers, and playbooks
- Nginx reverse proxy configuration
- WebSocket HTTP upgrade handling
- curl
- wscat and npm

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx map module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The handler example used a handler named `Validate and reload nginx` with `changed_when: false` and `notify: Reload nginx`. Ansible only notifies handlers when a task reports changed, so the nested reload notification would not run after validation. Updated the tasks to notify both `Validate nginx configuration` and `Reload nginx`, relying on handler definition order so validation runs before reload and a failed `nginx -t` stops the reload.
- The common pitfall section stated that Nginx defaults to HTTP/1.0 for upstream connections. Current Nginx documentation notes that HTTP upstream keepalive and HTTP/1.1 behavior changed in Nginx 1.29.7. Updated the wording to say older Nginx versions defaulted to HTTP/1.0 and that setting `proxy_http_version 1.1` explicitly keeps the configuration compatible across versions.

## Review Notes
The Nginx WebSocket headers, `map` usage, timeout guidance, upstream keepalive syntax, Ansible module usage, and test commands are technically valid. The `map` directive must remain in the Nginx `http` context; the shown Debian/Ubuntu-style `sites-enabled` inclusion normally satisfies that, but deployments with custom include layouts should confirm where the template is included.
