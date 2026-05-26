# Validation Summary: How to Use Ansible for Environment Promotion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible inventories and group variables
- Ansible built-in modules: assert, include_tasks, include_role, uri, wait_for, command, fail, pause, debug
- GitHub Actions workflow_dispatch pipelines
- CI/CD environment promotion and canary deployment patterns
- Prometheus-style metrics queries

## Sources Consulted
- Ansible playbook keywords: https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible roles and dynamic role inclusion: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- ansible.builtin.include_role module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_role_module.html
- ansible.builtin.uri module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.wait_for module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.command module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ad hoc commands: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible error handling and max_fail_percentage: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- GitHub Actions workflow syntax for workflow_dispatch inputs: https://docs.github.com/actions/reference/workflow-syntax-for-github-actions
- GitHub Actions contexts reference: https://docs.github.com/en/actions/learn-github-actions/contexts

## Issues Found
- The promotion playbook used a play-level `roles:` entry with a variable role name guarded by `when`. Replaced it with `ansible.builtin.include_role` in `tasks`, which is the documented dynamic role inclusion mechanism and supports task-level conditionals.
- The GitHub Actions staging and production deployment steps ran `playbooks/site.yml`, but the article defines the promotion playbook as `playbooks/promote.yml`. Updated both deployment commands to run `playbooks/promote.yml`.
- The production GitHub Actions job used `ansible-playbook` without installing Ansible first. Added the same Ansible installation step used by the staging job.

## Review Notes
All YAML snippets were parsed successfully after the fixes. Local Ansible was not installed in the review environment, so full `ansible-playbook --syntax-check` execution was not available.
