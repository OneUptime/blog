# Validation Summary: How to Implement Ansible Roles and Playbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible playbooks
- Ansible Galaxy CLI
- Ansible built-in modules: package, file, template, service, include_vars, include_tasks, uri
- YAML
- Jinja2 templates
- Nginx configuration

## Sources Consulted
- Ansible role documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Galaxy CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible execution strategy and serial documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Nginx listen directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The role scaffold command used `ansible-galaxy role init roles/nginx`. Official Ansible documentation describes `role init` as requiring a role name and using `--init-path` for the destination directory. Changed it to `ansible-galaxy role init nginx --init-path roles` so it creates `roles/nginx`.
- The Nginx virtual host template used `listen 443 ssl http2;`. Official Nginx documentation marks the `http2` listen parameter as deprecated and says to use the `http2` directive instead. Changed it to `listen 443 ssl;` plus `http2 on;`.

## Review Notes
- The YAML snippets parse successfully as YAML.
- Ansible was not installed in the local environment, so CLI behavior was verified against official Ansible documentation rather than local `--help` output.
- The generic `ansible.builtin.package` module only supports `latest` when the underlying package manager module supports it; the examples target common Debian and EL package managers where that state is supported.
