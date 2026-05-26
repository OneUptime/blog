# Validation Summary: How to Check if a File is Vault Encrypted in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- ansible-vault CLI
- Bash scripting
- Python scripting
- Git pre-commit hooks
- GitHub Actions
- Unix `file`, `head`, `find`, `awk`, and `wc` commands

## Sources Consulted
- Ansible Community Documentation: Protecting sensitive data with Ansible vault and vault file format: https://docs.ansible.com/projects/ansible/latest/vault_guide/index.html
- Ansible Community Documentation: Using encrypted variables and files, including vault file header format and vault ID behavior: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible Community Documentation: Encrypting content with Ansible Vault: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible Community Documentation: `ansible-vault` CLI actions and options: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Local `file` utility 5.45 magic database behavior for Ansible Vault headers.

## Issues Found
- The post claimed `ansible-vault is-encrypted` exists starting in Ansible 2.12. Current official Ansible CLI documentation lists `create`, `decrypt`, `edit`, `view`, `encrypt`, `encrypt_string`, and `rekey`, but no `is-encrypted` subcommand. Changed Method 8 to use `ansible-vault view` as a decryptability check and clarified that header inspection remains the no-password detection method.
- The audit script introduction said it reported all encrypted and unencrypted YAML files, but the script only printed encrypted YAML files and unencrypted files named `vault.yml` or `vault.yaml`. Updated the prose and script comment to match the actual behavior, and removed unused counters.
- The summary repeated the nonexistent `ansible-vault is-encrypted` command. Updated it to mention `head`, `file`, and `ansible-vault view` accurately.

## Review Notes
The header-format discussion is consistent with the official Ansible Vault file format documentation: file-level vault content starts with `$ANSIBLE_VAULT`, current writes use format `1.1` or `1.2` when a vault ID label is supplied, and `AES256` is the current cipher. The shell snippets are suitable for typical repository paths, though future hardening could improve handling of filenames containing whitespace in the pre-commit and CI examples.
