# Validation Summary: How to Store Ansible Vault Passwords in CI/CD Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible CLI and ansible.cfg
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- AWS Secrets Manager
- HashiCorp Vault
- Bash

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/
- Ansible managing vault passwords: https://docs.ansible.com/ansible/latest/vault_guide/vault_managing_passwords.html
- Ansible configuration settings for DEFAULT_VAULT_PASSWORD_FILE: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible ansible-vault CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- Jenkins Credentials Binding plugin documentation: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- AWS CLI get-secret-value reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/secretsmanager/get-secret-value.html
- HashiCorp Vault kv get command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/get

## Issues Found
- The examples used `echo` to write or emit vault passwords. `echo` can treat some values, such as strings beginning with `-n`, as options depending on the shell. Changed these examples to `printf '%s\n' ...` so arbitrary vault password values are handled more predictably.
- The section about using `ANSIBLE_VAULT_PASSWORD` said to use the `ANSIBLE_VAULT_PASSWORD_FILE` environment variable, but the example configured `vault_password_file` in `ansible.cfg`. Updated the wording to match the shown configuration.

## Review Notes
- The Ansible Vault flags and configuration shown in the post are valid: `--ask-vault-pass`, `--vault-password-file`, `--vault-id`, and `[defaults] vault_password_file`.
- Ansible can also use the `ANSIBLE_VAULT_PASSWORD_FILE` environment variable directly, but the post's corrected example now focuses on the `ansible.cfg` approach it demonstrates.
- The pinned `ansible==8.7.0` examples are syntactically valid, but future maintenance could consider using a currently supported Ansible version or a project-managed virtual environment/pipx installation.
