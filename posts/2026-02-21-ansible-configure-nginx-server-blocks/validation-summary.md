# Validation Summary: How to Use Ansible to Configure Nginx Server Blocks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, handlers, variables, and built-in modules
- Jinja2 templates for Ansible
- Nginx server blocks
- Nginx reverse proxy and upstream load balancing
- Nginx SSL/TLS and HTTP/2 configuration
- Nginx request rate limiting
- logrotate configuration

## Sources Consulted
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error handling and `changed_when` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx request limiting module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx logging documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/

## Issues Found
- The handler chain tested Nginx with `changed_when: false` and then notified the reload handler. Ansible only triggers handler notifications from tasks that report changed, so the reload handler would not run. Changed the test handler to report changed when it runs so a successful `nginx -t` can notify the reload handler.
- The playbook claimed to remove server blocks that are no longer in the variable list, but it only found and displayed unmanaged files. Added an `ansible.builtin.file` task with `state: absent` to remove the files returned by `ansible.builtin.find`.
- The rate limiting example used `limit_req zone=api` without defining the required shared memory zone with `limit_req_zone`. Replaced the scalar `rate_limit_zone` variable with a `rate_limit` mapping and added a matching `limit_req_zone` directive in the template.
- The template used `limit_req off` in the health check location. That is not valid Nginx syntax for the `limit_req` directive. Removed it and scoped rate limiting to normal content/proxy locations so the health check location is not rate limited by inheritance from the server block.
- The HTTPS server block used `listen 443 ssl http2`, which is deprecated in current Nginx releases. Changed it to `listen 443 ssl;` plus `http2 on;`.
- The template included hard-coded snippet files under `/etc/nginx/snippets/`. Those files are not guaranteed to exist and would make `nginx -t` fail on systems without them. Changed this to an optional `ssl_snippets` loop.
- The access log used the `main` log format, which is only valid if defined elsewhere with `log_format`. Changed it to the built-in `combined` format.
- The HTTP-only branch of the universal template did not handle `load_balanced` server blocks even though the template was described as universal. Added a load-balanced HTTP location for non-SSL configurations.

## Review Notes
- The generated `limit_req_zone` directive is valid when `/etc/nginx/conf.d/*.conf` files are included from the Nginx `http` context, which is the common package layout. If multiple server blocks intentionally reuse the same rate limit zone name, the zone should be defined once in a shared HTTP-level file rather than repeated per generated server block.
- The playbook removes every unmanaged `*.conf` file in `/etc/nginx/conf.d`. That matches the article's stated workflow, but production users should reserve that directory for Ansible-managed site files or narrow the pattern.
