# Validation Summary: How to Use Ansible with HashiCorp Vault for Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- HashiCorp Vault
- community.hashi_vault Ansible collection
- community.general Ansible collection
- Vault KV v2 secrets engine
- Vault database secrets engine
- Vault AppRole authentication
- Vault Agent auto-auth
- systemd

## Sources Consulted
- Ansible community.hashi_vault collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/index.html
- Ansible community.hashi_vault hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Ansible community.hashi_vault vault_kv2_get lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_get_lookup.html
- Ansible community.hashi_vault vault_read lookup documentation: https://ansible-collections.github.io/community.hashi_vault/branch/main/collections/community/hashi_vault/vault_read_lookup.html
- Ansible community.hashi_vault vault_kv2_write module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_kv2_write_module.html
- Ansible ansible.builtin.password lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- HashiCorp Vault AppRole API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Agent auto-auth documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth
- HashiCorp Vault token concepts documentation: https://developer.hashicorp.com/vault/docs/concepts/tokens

## Issues Found
- The Ansible configuration example used `[hashi_vault_connection]`, but current `community.hashi_vault` options document INI configuration under `[hashi_vault_collection]`. Updated the section name.
- The `VAULT_TOKEN` example used the pre-Vault 1.10 `s.` token prefix. Updated the placeholder to the current service token prefix, `hvs.`.
- The `hashi_vault` lookup example assigned the whole secret response where a password value was expected, and another example piped the lookup result through `from_json` unnecessarily. Updated both to read the `password` key with the documented `:keyname` syntax.
- The API key generation example used the short `password` lookup name. Updated it to the documented FQCN, `ansible.builtin.password`.
- The common-use-cases introduction referred to "this module" even though the post discusses a collection and integration pattern rather than one Ansible module. Updated the wording to "these patterns."
- The infrastructure workflow used `ansible.builtin.timezone`, but the documented module is `community.general.timezone`. Updated the FQCN.

## Review Notes
- The `community.hashi_vault.hashi_vault` lookup remains available, but Ansible's collection documentation recommends newer, more specific lookups such as `vault_kv2_get` and `vault_read` for new content.
- The Vault Agent example is intentionally skeletal and assumes matching templates and handlers exist elsewhere in the role.
