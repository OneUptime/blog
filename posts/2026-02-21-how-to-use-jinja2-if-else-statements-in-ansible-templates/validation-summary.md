# Validation Summary: How to Use Jinja2 if/else Statements in Ansible Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Jinja2 templates
- YAML playbooks
- Nginx configuration

## Sources Consulted
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible playbook tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible filters documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_filters.html
- Nginx `ngx_http_v2_module` documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_core_module` `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen

## Issues Found
- The database SSL example checked only `db_ssl_cert is defined` before rendering `db_ssl_key` and `db_ssl_ca`. I updated the condition to require `db_ssl_cert`, `db_ssl_key`, and `db_ssl_ca` so the optional SSL block does not reference undefined variables.
- The full Nginx example used `listen 443 ssl http2;`. Current Nginx documentation marks the `http2` parameter on `listen` as deprecated in favor of the separate `http2 on;` directive. I changed the example to `listen 443 ssl;` followed by `http2 on;`.

## Review Notes
The remaining Jinja2 conditional syntax, tests, inline conditional expressions, whitespace-control syntax, `in` operator usage, Ansible template task fields, and quoted file mode example align with the referenced official documentation. The examples assume the feature flag variables shown in conditions are defined by inventory, group variables, host variables, or play variables.
