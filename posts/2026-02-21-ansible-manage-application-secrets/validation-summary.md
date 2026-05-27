# Validation Summary: How to Use Ansible to Manage Application Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Vault
- HashiCorp Vault
- community.hashi_vault Ansible collection
- AWS Secrets Manager
- amazon.aws Ansible collection
- YAML playbooks and variable files

## Sources Consulted
- Ansible Vault guide: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html
- Ansible Vault CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- Ansible encrypted content and vault IDs: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible logging and no_log documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- community.hashi_vault collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/index.html
- community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- community.hashi_vault.vault_kv2_get lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_get_lookup.html
- amazon.aws.secretsmanager_secret lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/secretsmanager_secret_lookup.html
- Ansible playbook strategy and serial documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html

## Issues Found
- The HashiCorp Vault lookup example used the older short `hashi_vault` lookup name and term-string parameters. Updated it to install `community.hashi_vault` and use the current fully qualified `community.hashi_vault.vault_kv2_get` lookup with keyword parameters and `.secret` access for KV v2 results.
- The AWS Secrets Manager example used the short `aws_secret` lookup alias. Updated it to install the `amazon.aws` collection and use the current fully qualified `amazon.aws.secretsmanager_secret` lookup name, with boto3 and botocore listed as requirements.

## Review Notes
Ansible was not installed in the local environment, so CLI validation was performed against the official Ansible command documentation rather than local `--help` output. The remaining Vault commands, vault ID usage, `ANSIBLE_VAULT_PASSWORD_FILE`, `no_log: true`, file modes, and `serial: 1` rolling update pattern are consistent with official documentation.
