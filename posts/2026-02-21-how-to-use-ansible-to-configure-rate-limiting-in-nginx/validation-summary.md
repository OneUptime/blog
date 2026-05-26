# Validation Summary: How to Use Ansible to Configure Rate Limiting in Nginx

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks, roles, tasks, handlers, and inventory
- Nginx HTTP rate limiting with `ngx_http_limit_req_module`
- Nginx configuration templates with Jinja2
- Nginx `geo`, `map`, logging, and `stub_status`
- ApacheBench (`ab`) load testing

## Sources Consulted
- Nginx `ngx_http_limit_req_module` documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx `ngx_http_stub_status_module` documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Nginx `ngx_http_geo_module` documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Ansible handler documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- ApacheBench documentation: https://httpd.apache.org/docs/current/en/programs/ab.html

## Issues Found
- The project structure omitted `roles/nginx_rate_limit/handlers/main.yml`, even though the tutorial later requires that file. Added the handlers directory and file to the structure.
- The handler chain would not reload Nginx because the validation handler used `changed_when: false` and then notified the reload handler. Ansible only notifies handlers from tasks that report changed, so the reload handler would not run. Changed the handlers to use a shared `listen` topic so both validation and reload are notified directly, with validation defined first.
- The monitoring snippet used `stub_status on;`, but current Nginx documentation specifies `stub_status;`. Updated the snippet.
- The monitoring section implied `stub_status` can track rate-limit events. It only exposes basic connection and total request counters. Updated the text to use `$limit_req_status` and error logs for rate-limit visibility, and kept `stub_status` for overall connection/request monitoring.

## Review Notes
- The Nginx rate-limit directives, rate formats (`r/s`, `r/m`), empty-key allowlist behavior, `geo`/`map` approach, `ab` command options, and Ansible module usage are consistent with the consulted documentation.
- The tutorial assumes a Debian/Ubuntu-style Nginx layout with `/etc/nginx/sites-available`, `/etc/nginx/sites-enabled`, and `/etc/nginx/conf.d`; that is appropriate for the `apt`-based installation shown.
