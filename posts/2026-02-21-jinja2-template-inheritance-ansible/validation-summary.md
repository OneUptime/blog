# Validation Summary: How to Use Jinja2 Template Inheritance in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and the `ansible.builtin.template` module
- Jinja2 template inheritance, blocks, and `super()`
- systemd service unit files and resource control directives
- Nginx virtual host configuration and HTTP/2

## Sources Consulted
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/stable/templates/
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible search paths documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- systemd resource control documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.resource-control.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx 1.25.1 release announcement: https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html

## Issues Found
- The first play notified `Reload systemd` but did not define a handler in that play. Added the handler to the web application play because Ansible handlers are scoped at the play level.
- The playbook examples used child templates that referenced `service_workdir` directly, but the sample vars did not define it. Added `service_workdir` values for the web and worker plays.
- The Nginx base template used `listen ... ssl http2`, which is deprecated in Nginx 1.25.1 and later. Changed it to `listen ... ssl;` plus `http2 on;`.
- The Jinja caveat said `{% extends %}` must be the first tag and that no other tags can appear before it. Adjusted the wording to match Jinja's behavior: it should be the first Jinja statement, comments before it are fine, and output before it is rendered before the parent template.
- The worker service was described as using "tighter" resource limits even though `LimitNPROC` increased from the base value. Changed the wording to "custom constraints."

## Review Notes
- The Jinja inheritance examples, block override behavior, `super()` usage, Ansible template module usage, systemd directives, and template path guidance are otherwise consistent with the official documentation consulted.
- The Nginx `http2 on;` directive requires Nginx 1.25.1 or later; older Nginx versions used the now-deprecated `listen ... http2` parameter.
