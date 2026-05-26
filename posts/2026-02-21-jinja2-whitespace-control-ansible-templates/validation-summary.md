# Validation Summary: How to Use Jinja2 Whitespace Control in Ansible Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Jinja2
- YAML
- Nginx configuration templating
- HAProxy configuration templating

## Sources Consulted
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/#whitespace-control
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible configuration settings reference: https://docs.ansible.com/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.template` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_lookup.html
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html

## Issues Found
- The post described Jinja2's default whitespace behavior as though it applied directly to Ansible's template module. Ansible has loaded templates with `trim_blocks=True` since Ansible 0.9, so the opening explanation and the simple hosts example were updated to distinguish plain Jinja2 defaults from Ansible's defaults.
- The Nginx example claimed the whitespace-controlled template would render cleanly in normal Ansible usage. With Ansible's default `trim_blocks: true`, that exact dash-heavy template collapses multiple lines. The example task now sets `trim_blocks: false` explicitly so the before-and-after output matches the described behavior.
- The "Global Whitespace Settings in Ansible" section incorrectly used `jinja2_extensions` and `jinja2_native` as whitespace settings. That section was corrected to explain `trim_blocks` and `lstrip_blocks` on `ansible.builtin.template`, the `#jinja2` template header, and the actual purpose of `jinja2_extensions` and `jinja2_native`.
- The wrap-up recommended enabling `trim_blocks` and `lstrip_blocks` globally. Since the documented Ansible controls are per task or per template header, this was changed to recommend keeping Ansible's default `trim_blocks`, enabling `lstrip_blocks` where needed, and using dash modifiers for edge cases.
- The Nginx example placed `health_check interval=30;` directly inside an HTTP `upstream` block. Official Nginx documentation defines `health_check` in a `location` context for HTTP active health checks, while `keepalive` is valid in `upstream` context. The example was changed to conditional keepalive configuration.

## Review Notes
None.
