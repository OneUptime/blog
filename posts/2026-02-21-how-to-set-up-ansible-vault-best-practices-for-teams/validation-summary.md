# Validation Summary: How to Set Up Ansible Vault Best Practices for Teams

## Status
validated

## Post Type
Tutorial / Best practices guide

## Technologies Covered
- Ansible
- Ansible Vault
- ansible.cfg configuration
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Git diff drivers and pre-commit hooks
- 1Password CLI, AWS Secrets Manager, and HashiCorp Vault as secret sources

## Sources Consulted
- Ansible Vault overview: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible Vault password management and vault IDs: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_managing_passwords.html
- Using encrypted variables and files with vault passwords: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- ansible-vault CLI reference: https://docs.ansible.com/projects/ansible-core/2.17/cli/ansible-vault.html
- Ansible configuration settings for vault_password_file and vault_identity_list: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- The vault password rotation script used `--old-vault-password-file`, which is not a valid `ansible-vault rekey` option. Changed it to `--vault-password-file` for the existing password and kept `--new-vault-password-file` for the new password, matching the official CLI reference.
- The pre-commit hook checked all staged vault file paths, including deleted files. Changed the staged file query to `git diff --cached --name-only --diff-filter=ACM` so deleted vault files are not incorrectly passed to `head`.

## Review Notes
The Ansible Vault examples for `--vault-id`, `vault_password_file`, `vault_identity_list`, executable password sources, and encrypted file headers match the current Ansible documentation. The CI/CD examples follow the expected pattern of sourcing passwords from platform secret stores and passing them to Ansible via a restricted temporary file. Future improvements could mention that vault ID labels are hints by default unless `vault_id_match` is enabled.
