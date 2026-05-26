# Validation Summary: How to Use AWX with Ansible Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- AWX
- AWX API
- YAML
- curl
- jq

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- ansible-vault CLI reference: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-vault.html
- AWX credentials user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX multi-credential assignment administration guide: https://docs.ansible.com/projects/awx/en/24.6.1/administration/multi-creds-assignment.html
- awx.awx credential module reference: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/credential_module.html

## Issues Found
- The post hard-coded `credential_type: 3` as the AWX Vault credential type. AWX credential type IDs are database IDs and can vary by installation, so I changed the examples to look up the built-in Vault credential type through `/api/v2/credential_types/?namespace=vault` and use that ID.
- The job template credential association examples posted only `{"id": ...}`. AWX documents the association endpoint with `{"associate": true, "id": ...}`, so I updated both examples.
- The wrap-up claimed the setup gives secrets that are "encrypted in transit." Ansible Vault documentation states Vault protects data at rest; transport encryption depends on the surrounding systems such as HTTPS/SSH/Git transport. I removed that claim.

## Review Notes
The remaining Ansible Vault commands and options checked out against the current ansible-vault CLI documentation, including `encrypt`, `encrypt_string`, `--vault-id`, `--name`, `rekey`, and `--new-vault-id`. The AWX Vault credential fields `vault_password` and optional `vault_id` are documented as valid credential inputs.
