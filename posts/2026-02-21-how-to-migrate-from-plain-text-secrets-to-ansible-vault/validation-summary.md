# Validation Summary: How to Migrate from Plain Text Secrets to Ansible Vault

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible
- Ansible Vault
- Ansible variable precedence
- Ansible `group_vars` and `host_vars`
- `community.mysql.mysql_user`
- Git history cleanup with `git-filter-repo`
- CI/CD secret handling

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible Vault encrypting content: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible configuration settings, `vault_password_file`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `host_group_vars` vars plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/host_group_vars_vars.html
- Ansible variable precedence documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- `community.mysql.mysql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html

## Issues Found
- The vault password setup redirected output into `~/.ansible/vault_password` without ensuring that `~/.ansible` exists. Added `mkdir -p ~/.ansible` before the `openssl rand` command so the example works on a fresh machine.
- The role migration guidance treated role defaults and role vars as equivalent. Updated the text to clarify that `group_vars` and `host_vars` can override role defaults, but role vars override inventory variables, so secrets in `vars/main.yml` should be removed rather than replaced with empty placeholders.

## Review Notes
- The Ansible Vault commands, `vault_password_file` configuration key, `--vault-password-file` usage, `ansible-vault create`, `ansible-vault view`, and `ansible-vault encrypt` examples match current Ansible documentation.
- The separate `vault.yml` plus cleartext reference file pattern is consistent with Ansible documentation for keeping vaulted variables safely visible.
- `no_log: true` is appropriate for tasks that handle sensitive values, but teams should still audit callbacks, CI logs, and module output because Vault protects data at rest, not every use of decrypted data.
