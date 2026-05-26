# Validation Summary: How to Use Ansible Playbook with Variable Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible variable files
- `vars_files`
- `ansible.builtin.include_vars`
- `ansible-playbook --extra-vars`
- Ansible Vault
- YAML

## Sources Consulted
- Ansible documentation: Using variables and variable precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible documentation: `ansible.builtin.include_vars` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible documentation: `ansible-playbook` CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible documentation: `ansible-vault` CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible documentation: Encrypting content with Ansible Vault: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html

## Issues Found
- The "vars_files with Fallback" section described `vars_files` as a fallback mechanism. In Ansible, `vars_files` loads the listed files; it does not skip to a fallback file when an earlier file is absent. I changed the section to describe loading defaults first and environment-specific overrides second, and reordered the files so the override behavior matches Ansible variable precedence.
- The debug example in that section referenced `env_name` directly even though the play only used `default('development')` in the file path. I updated the debug message to use the same default filter so it does not fail when `env_name` is undefined.
- One comment said `include_vars` was "Load based on a condition" without using a `when` condition. I changed it to "Load based on facts" to match the example's dynamic fact-based filename.
- The simplified variable precedence list placed play `vars_files` before play `vars`. Official Ansible precedence lists play vars before play vars_files, so I corrected the order.

## Review Notes
- The short module names used in the examples, such as `include_vars`, `template`, `package`, `systemd`, and `debug`, remain valid in normal playbooks, though Ansible documentation recommends fully qualified collection names for clearer links and to avoid collection name conflicts.
- `-e "debug=false"` uses Ansible's key=value extra-vars form, where values are commonly treated as strings. Use YAML or JSON extra-vars syntax when a strict boolean is required.
