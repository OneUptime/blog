# Validation Summary: How to Use the unvault Filter in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- Ansible Jinja2 filters
- ansible.builtin.file lookup
- ansible.builtin.slurp module
- ansible.builtin.include_vars module
- YAML and JSON parsing filters

## Sources Consulted
- Ansible documentation: ansible.builtin.unvault filter - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unvault_filter.html
- Ansible documentation: ansible.builtin.file lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_lookup.html
- Ansible documentation: ansible.builtin.slurp module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible documentation: Encrypting content with Ansible Vault - https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible documentation: ansible-vault CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html

## Issues Found
- The post used `| unvault` without the required vault secret argument. Official Ansible documentation defines `secret` as a required positional parameter, so examples were updated to use `unvault(vault_passphrase)`.
- The basic example used a truncated `!vault` tagged value and then passed it through `unvault`. This was misleading because `!vault` variables are normally decrypted automatically by Ansible. The example now uses raw vault text loaded with the `file` lookup.
- The explanation of `unvault` did not mention that the filter requires the vault secret to be supplied in the expression. The affected descriptions and compatibility notes were updated.
- The section title "Using unvault with vault_encrypted File Lookup" implied a non-existent lookup plugin name. It was corrected to "Using unvault with the file Lookup."
- The dynamic variable-name example used `regex_replace('.yml$', '')`, where `.` matched any character. It was corrected to `regex_replace('\\.yml$', '')` to match the literal `.yml` suffix.

## Review Notes
Ansible and ansible-doc were not installed in the local environment, so examples were not executed locally. Validation was performed against current official Ansible documentation. The examples assume `vault_passphrase` is supplied securely, shown via `MY_VAULT_PASSPHRASE` for compactness; production playbooks should avoid exposing vault secrets in logs and process environments.
