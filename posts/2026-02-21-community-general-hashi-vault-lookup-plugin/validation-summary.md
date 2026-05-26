# Validation Summary: How to Use the community.general.hashi_vault Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.hashi_vault lookup plugin
- community.hashi_vault collection
- HashiCorp Vault
- Vault KV v2 secrets engine
- Vault AppRole authentication
- Vault AWS IAM authentication
- Vault database secrets engine
- Vault PKI secrets engine
- hvac Python library

## Sources Consulted
- Ansible community.general.hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/hashi_vault_lookup.html
- Ansible community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Ansible community.hashi_vault migration guide for hashi_vault return formats and KV v2 behavior: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/docsite/migration_hashi_vault_lookup.html
- Ansible community.hashi_vault.vault_write lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_write_lookup.html
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault database secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault PKI secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The prerequisite command installed only `community.general`, but `community.general.hashi_vault` is a redirect to `community.hashi_vault.hashi_vault`. Added installation of `community.hashi_vault` so the redirected plugin and the later `vault_write` example are available.
- The basic usage example claimed to fetch a database password but read the whole secret. Changed the lookup path to use colon field dereferencing with `:password`.
- The KV v2 section stated that the default lookup result is nested under `data`. The current `hashi_vault` lookup returns the inner KV v2 secret data by default. Updated the field references from `full_secret.data.*` to `full_secret.*`.
- The practical template example used `db_config.data.*`, `redis_config.data.*`, and `api_keys.data.*` for KV v2 lookup results. Updated those references to access the returned secret fields directly.
- The dynamic database credentials example accessed `lease_duration` from the default `hashi_vault` return value, but that default strips the top-level Vault response and returns only `data`. Changed the lookup to `return_format='raw'` and updated username/password references to `temp_creds.data.*` so both credentials and lease metadata are available.
- The PKI example attempted to pass `method='POST'` and `data=...` to `community.general.hashi_vault`, which is a read-oriented lookup. Changed the example to use `community.hashi_vault.vault_write`, which supports Vault write operations with a `data` request body, and updated returned certificate/private-key references to `cert_data.data.*`.

## Review Notes
The `community.general.hashi_vault` name is still usable as a redirect in current community.general releases, but the canonical implementation is in `community.hashi_vault`. The redirect does not work with Ansible 2.9, so older environments should use `community.hashi_vault.hashi_vault` directly.
