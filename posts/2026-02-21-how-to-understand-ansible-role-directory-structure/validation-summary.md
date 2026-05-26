# Validation Summary: How to Understand Ansible Role Directory Structure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible playbooks
- Ansible variables and variable precedence
- Ansible custom modules and plugins
- YAML
- Jinja2 templates
- Python-based Ansible modules and filter plugins

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: Lookup plugins - https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html

## Issues Found
- The post said `tasks/` is the only truly required role directory. Current Ansible documentation says no individual role file is required and a role is valid if it includes at least one standard role directory or artifact. I changed the wording to say `tasks/` is where main execution logic normally lives, but a role can be valid without it.
- The role search order omitted collection roles and incorrectly listed the current working directory. I updated the list to match current Ansible documentation: collections, `roles/` relative to the playbook, configured `roles_path`, and the directory where the playbook file is located.
- The `library/` section implied custom modules are available only while the role is active. Ansible documentation states embedded modules in standalone roles are usable by the role itself and roles called after it. I corrected the description and the code comment.
- The filter plugin example comment said the custom filter is available only within the role. Ansible documentation describes embedded role filters as usable by templates in later roles as well, so I corrected the comment.
- The quick reference table included numeric precedence labels for `defaults/` and `vars/` that did not match the current official precedence list. I replaced them with non-numeric `Very low` and `High` labels to avoid inaccurate version-sensitive numbering.

## Review Notes
The remaining examples are illustrative and syntactically valid for their stated purpose. Role dependency, `copy`, `script`, `template`, `include_tasks`, `import_tasks`, `include_vars`, handler deduplication, and role variable guidance are consistent with current Ansible documentation. Collection-based roles use collection plugin layouts rather than standalone role plugin embedding; the corrected `library/` wording now calls out standalone roles.
