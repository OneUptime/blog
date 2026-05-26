# Validation Summary: How to Write Idempotent Ansible Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and task semantics
- Ansible built-in modules: apt, service, template, file, command, shell, lineinfile, blockinfile, get_url, user
- Ansible task controls: when, register, changed_when, failed_when, creates, removes, handlers
- Ansible MySQL collection module: ansible.mysql.mysql_db
- Molecule idempotence testing

## Sources Consulted
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible blockinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible playbook error handling documentation for changed_when and failed_when: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible MySQL mysql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/

## Issues Found
- The database command example was introduced as a `creates`/`removes` fix, but it did not use either option and its `changed_when` expression would not reliably report no change for an existing database. Replaced it with a state-check task followed by a conditional create task, matching Ansible's documented `register`, `changed_when`, and `when` pattern for arbitrary commands.
- The MySQL module example used `community.mysql.mysql_db`. Current Ansible documentation says `community.mysql` has been renamed to `ansible.mysql` and new playbooks should use `ansible.mysql` directly. Updated the example to `ansible.mysql.mysql_db`.

## Review Notes
The remaining examples match documented module parameters and behavior. The Molecule snippet uses a valid custom `test_sequence` with `idempotence`; current Molecule documentation also notes newer ansible-native configuration patterns, but the shown pre-ansible-native style remains recognizable and technically valid when the appropriate driver plugin is installed.
