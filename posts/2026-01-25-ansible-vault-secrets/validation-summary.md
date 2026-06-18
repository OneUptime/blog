# Validation Summary: How to Use Ansible Vault for Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Vault
- Ansible playbooks
- YAML inventory and variable files
- GitHub Actions
- GitLab CI
- HashiCorp Vault lookup plugins
- AWS Secrets Manager lookup plugins

## Sources Consulted
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible Vault encryption guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible Vault password management guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_managing_passwords.html
- Ansible Vault encrypted content and file format guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible configuration settings for vault_password_file: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- amazon.aws.secretsmanager_secret lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/secretsmanager_secret_lookup.html

## Issues Found
- The `ansible-vault encrypt_string` examples did not provide a vault password source. Current Ansible documentation shows `encrypt_string` usage with a password source such as `--ask-vault-pass`, `--vault-password-file`, or `--vault-id`. Updated the direct string and stdin examples to include `--ask-vault-pass`.
- The rekey example used `old_pass` and `new_pass` in `--vault-id` and `--new-vault-id`, which could be misread as literal inline passwords. Updated the placeholders to `old_pass_file` and `new_pass_file` to reflect Ansible's vault ID source format.
- The external secret manager examples used short lookup names. Updated them to the current fully qualified collection names: `community.hashi_vault.hashi_vault` and `amazon.aws.secretsmanager_secret`.

## Review Notes
Ansible was not installed in the local environment, so local CLI help could not be used. Commands and claims were checked against the current official Ansible documentation instead. The GitHub Actions and GitLab CI snippets are structurally plausible, but production pipelines should normally prefer masked CI secrets, runner cleanup controls, and short-lived credentials where possible.
