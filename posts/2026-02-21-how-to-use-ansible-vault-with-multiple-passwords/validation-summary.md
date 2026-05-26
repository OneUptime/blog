# Validation Summary: How to Use Ansible Vault with Multiple Passwords

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible vault IDs
- Ansible CLI commands (`ansible-vault`, `ansible-playbook`)
- Ansible configuration (`ansible.cfg`)
- YAML encrypted variables

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Encrypting content with Ansible Vault: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Using encrypted variables and files: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- `ansible-vault` CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- Clarified that vault ID labels are hints by default and cause Ansible to try the matching password first, rather than guaranteeing that Ansible "knows" and uses only that password. Official documentation states that Ansible tries the matching vault secret first, then other provided secrets unless strict vault ID matching is enabled.
- Corrected the legacy/default vault ID explanation. Files encrypted without a vault ID have no vault ID label in the header; Ansible's default vault identity is named `default`, but the encrypted content itself is unlabeled.

## Review Notes
The local environment did not have `ansible-vault` or `ansible-playbook` installed, so command validation was performed against current official Ansible documentation instead of local `--help` output. The documented commands, `vault_identity_list` configuration key, `--vault-id` usage, inline `encrypt_string` format, and fallback password behavior are consistent with the official documentation.
