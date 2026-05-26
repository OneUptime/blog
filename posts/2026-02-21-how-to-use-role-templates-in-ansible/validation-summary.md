# Validation Summary: How to Use Role Templates in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles
- ansible.builtin.template module
- Jinja2 templates
- Ansible facts and filters
- Nginx, HAProxy, sudoers, and logrotate configuration examples

## Sources Consulted
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible filter documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_filters.html
- Jinja Template Designer Documentation: https://jinja.palletsprojects.com/en/3.1.x/templates/

## Issues Found
- The whitespace-control example used `{%- ... %}` around a loop in a way that would concatenate generated lines under Ansible's default `trim_blocks=True` behavior. I updated the explanation to mention Ansible's default trimming and adjusted the example so it preserves one line per rendered feature.

## Review Notes
- The `validate` examples are technically correct. Ansible passes the temporary rendered file path through `%s`; shell features such as pipes and expansion are not available in `validate` commands.
- The examples rely on gathered facts such as `ansible_default_ipv4` and `ansible_processor_vcpus`, so playbooks using those snippets need facts enabled or equivalent variables supplied.
