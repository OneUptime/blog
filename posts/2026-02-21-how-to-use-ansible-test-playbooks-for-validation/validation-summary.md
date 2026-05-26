# Validation Summary: How to Use Ansible Test Playbooks for Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: assert, package_facts, service_facts, stat, find, slurp, set_fact, wait_for, uri, command, include_tasks, debug
- Ansible tags and task result tests
- Molecule verification playbooks
- PostgreSQL command-line checks with pg_isready and psql

## Sources Consulted
- Ansible assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible package_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible service_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible playbook tags documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tags.html
- Ansible task result tests documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/

## Issues Found
- The reporting example used `failed_when: false` on the `wait_for` port check and then recorded success with `port_check is not failed`. Because `failed_when: false` redefines the task as non-failed, the recorded result could pass even when the port check timed out. Changed the task to `ignore_errors: true`, which allows the playbook to continue while preserving the registered failed result for the later `is not failed` test.

## Review Notes
- The local workspace does not have `ansible-playbook` or `ansible-doc` installed, so examples were checked against current official Ansible and Molecule documentation rather than executed with Ansible.
- All YAML code fences in the post parse as valid YAML after the fix.
