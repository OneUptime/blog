# Validation Summary: How to Use Ansible Conditionals with Inventory Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory groups
- Ansible magic variables (`group_names`, `groups`, `inventory_hostname`)
- Ansible `when` conditionals
- Ansible built-in modules (`debug`, `apt`, `include_role`, `lineinfile`, `template`, `include_vars`, `copy`, `set_fact`)
- Jinja2 expressions and Ansible filters (`default`, `length`, `intersect`, `trim`)

## Sources Consulted
- Ansible documentation: Special Variables - https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible documentation: Discovering variables, facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: How to build your inventory - https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- Ansible documentation: Conditionals - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible documentation: ansible.builtin.include_role module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible documentation: ansible.builtin.include_vars module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible documentation: ansible.builtin.intersect filter - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/intersect_filter.html

## Issues Found
- The service discovery example defined `services_to_register` only as a task-level variable on the `template` task, then referenced it in a later `debug` task where it would be undefined. I added the same `vars` definition to the `debug` task so the example works as written.
- The group size warning task used `groups['webservers'] | default([])` in the condition but used `groups['webservers'] | length` in the message. If the group did not exist, the condition would evaluate safely and then the message could fail. I added the same `default([])` guard to the message.

## Review Notes
The examples assume Debian/Ubuntu-style hosts for `ansible.builtin.apt` package tasks and assume the referenced roles, templates, files, and destination directories exist. Those are normal tutorial placeholders rather than technical inaccuracies.
