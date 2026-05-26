# Validation Summary: How to Store SSH Keys in Ansible Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible playbooks and built-in modules
- OpenSSH private keys and client configuration
- YAML block scalars
- Git over SSH deploy keys

## Sources Consulted
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible Vault encrypting content guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible no_log documentation: https://docs.ansible.com/projects/ansible/8/reference_appendices/logging.html
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- The variable-level Vault example used `ansible-vault encrypt_string` but then showed a plaintext variable file that would only be encrypted later as a whole file. Updated the wording and command to use `--stdin-name` for single-variable encryption, and clarified that the plaintext block applies to the whole-file encryption alternative.
- The post claimed an extra newline at the end of an SSH private key can cause `ssh` to reject it. OpenSSH accepts the normal final newline, and local verification showed extra trailing blank lines were accepted while a missing final newline caused key parsing to fail. Updated the pitfall to warn about missing final newlines and folded lines instead.
- The file-permissions wording said private keys must be exactly `0600` and `.ssh` must be exactly `0700`. OpenSSH requires private keys not be accessible by other users; `0600` and `0700` are correct recommended modes, but not the only possible safe modes. Updated the wording to present them as safe modes to use.

## Review Notes
- `ansible-vault` was not installed in the local environment, so CLI syntax was verified against official Ansible documentation rather than local `--help` output.
- The `ansible.builtin.git` example uses `accept_hostkey: true`, which is still documented, but pre-populating `known_hosts` with verified host keys is usually preferable for stricter production security.
