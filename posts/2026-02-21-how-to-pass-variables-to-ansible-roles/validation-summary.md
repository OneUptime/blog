# Validation Summary: How to Pass Variables to Ansible Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible role variables and defaults
- Ansible inventory variables
- Ansible playbook variables and vars_files
- Ansible include_role
- Ansible role dependencies
- Ansible extra vars

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Community Documentation: ansible.builtin.include_role module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: Controlling how Ansible behaves: precedence rules - https://docs.ansible.com/projects/ansible/13/reference_appendices/general_precedence.html

## Issues Found
- The post stated that variables passed in the roles block do not override `vars/main.yml`. This is inaccurate for direct role parameters, which have higher precedence than role vars. Updated the wording to distinguish direct role parameters from variables passed through the `vars` keyword.
- The post stated that command-line extra variables override everything except role `vars/main.yml`. Ansible documents extra vars as the highest-precedence variable source. Updated the wording to say extra vars override role vars too.
- The post stated that Ansible only executes a role once per play even if listed multiple times. Ansible de-duplicates identical role entries, but runs a role more than once when different role parameters are passed. Updated the wording to include that distinction and clarify when `include_role` or `allow_duplicates: true` is appropriate.

## Review Notes
The examples use the short module names such as `include_role`, `user`, `file`, `template`, and `service`. These remain valid because the modules are in `ansible.builtin`; using fully qualified collection names would improve explicitness but is not required for correctness.
