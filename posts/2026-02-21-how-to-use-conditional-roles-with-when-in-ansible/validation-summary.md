# Validation Summary: How to Use Conditional Roles with when in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- `ansible.builtin.include_role`
- `ansible.builtin.import_role`
- Ansible `when` conditionals
- Ansible facts, magic variables, registered variables, and check mode

## Sources Consulted
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible `import_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_role_module.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible `bool` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/bool_filter.html

## Issues Found
- Clarified that Ansible gathers facts by default at the start of a play. This avoids implying facts are always gathered when `gather_facts` can be disabled.
- Reworded the check mode guidance to describe it as a simulation and added the caveat that conditions based on registered results from earlier tasks may be less useful in check mode, matching the official check mode documentation.

## Review Notes
The role conditional behavior described in the post matches the official Ansible documentation: `include_role` applies task-level conditionals to the include task itself, while static role usage through `roles:` and `import_role` applies the condition to the tasks inside the role. The examples use current fully qualified module names and valid conditional patterns.
