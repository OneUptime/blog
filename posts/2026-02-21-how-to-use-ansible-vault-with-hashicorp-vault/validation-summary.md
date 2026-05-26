# Validation Summary: How to Use Ansible Vault with HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Vault
- HashiCorp Vault
- community.hashi_vault Ansible collection
- HashiCorp Vault KV secrets engine
- HashiCorp Vault AppRole, token, and AWS IAM authentication
- HashiCorp Vault database dynamic secrets
- HashiCorp Vault PKI secrets engine

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/ansible/latest/vault_guide/vault.html
- Ansible vault password management: https://docs.ansible.com/projects/ansible-core/devel/vault_guide/vault_managing_passwords.html
- ansible-vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- community.hashi_vault collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/index.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- community.hashi_vault.vault_read module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_read_module.html
- community.hashi_vault.vault_write module documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/vault_write_module.html
- community.hashi_vault.vault_pki_generate_certificate module documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/vault_pki_generate_certificate_module.html
- HashiCorp Vault KV CLI documentation: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The section title referred to a `hashi_vault_secret` module, but the example correctly used `community.hashi_vault.vault_read`. Updated the heading to `Using the vault_read Module` because `hashi_vault_secret` is not listed in the current `community.hashi_vault` plugin index.
- The dynamic database credentials example accessed `dynamic_db_creds.data.username` and `dynamic_db_creds.data.password`. The `vault_read` module returns the raw Vault response under `data`, and dynamic database credentials are nested under the Vault response's `data` key. Updated the fields to `dynamic_db_creds.data.data.username` and `dynamic_db_creds.data.data.password`.
- The complete playbook used `vault_read` against `pki/issue/webserver`, but certificate issuance is a PKI generation/write-style operation, not a generic read. Replaced it with `community.hashi_vault.vault_pki_generate_certificate` and added the required `role_name` and `common_name` parameters.

## Review Notes
- The `community.hashi_vault.hashi_vault` lookup remains documented, but the official docs suggest considering newer dedicated plugins for some use cases. The post's examples are still valid, so no content change was required.
- I could not run local Ansible syntax validation because `ansible-playbook` is not installed in this environment.
