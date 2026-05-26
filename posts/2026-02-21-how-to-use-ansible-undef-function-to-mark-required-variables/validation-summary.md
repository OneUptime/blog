# Validation Summary: How to Use Ansible undef Function to Mark Required Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible roles
- Ansible variable precedence
- Jinja2 templating in Ansible
- Ansible role argument validation
- Ansible built-in modules: assert, user, group, file, get_url, template

## Sources Consulted
- Ansible documentation: The undef function: add hint for undefined variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating_undef.html
- Ansible-core 2.12 Porting Guide - https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_core_2.12.html
- Ansible documentation: Using variables / variable precedence - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: Roles and role argument validation - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible documentation: ansible.builtin.user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: ansible.builtin.group module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html

## Issues Found
- The introduction said required variables must be set before the role runs. `undef()` produces an undefined value that fails when the variable is evaluated, not necessarily at role start. Updated the wording to say the variable must be set before the role uses it.
- The description of failure behavior said Ansible fails immediately. Updated it to clarify that Ansible fails at the point where the undefined variable is accessed.
- The application deployment role created a user with `group: "{{ app_deploy_group }}"` but did not create that primary group first. Added an `ansible.builtin.group` task before the user task so the example role is runnable on systems where the group does not already exist.
- The migration example converted an `assert` check for a defined and non-empty `db_password` into `undef()`, but `undef()` only checks whether a variable is undefined and does not validate non-empty content. Updated the example to validate existence only, matching the later caveat that value constraints still need `assert` or `argument_specs`.

## Review Notes
The main guidance is technically accurate for Ansible 2.12 and later: `undef()` accepts an optional `hint`, role defaults have very low precedence, and role vars are harder to override than inventory variables. `argument_specs` remains the stronger tool for type and value validation.
