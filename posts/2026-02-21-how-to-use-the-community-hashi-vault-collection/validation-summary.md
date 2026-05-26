# Validation Summary: How to Use the community.hashi_vault Collection

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Ansible
- community.hashi_vault Ansible collection
- HashiCorp Vault
- Vault KV v2 secrets engine
- Vault AppRole and JWT authentication
- Vault database secrets engine
- hvac Python library

## Sources Consulted
- Ansible community.hashi_vault collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/index.html
- Ansible community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Ansible community.hashi_vault.vault_read module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_read_module.html
- Ansible community.hashi_vault.vault_write module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_write_module.html
- Ansible community.hashi_vault.vault_login module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/hashi_vault/vault_login_module.html
- Ansible playbook environment documentation: https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Kubernetes as OIDC/JWT authentication documentation: https://docs.hashicorp.com/vault/docs/auth/jwt/oidc-providers/kubernetes

## Issues Found
- The post claimed the collection includes inventory and connection plugins and can use Vault as a dynamic inventory source. The current official plugin index lists modules, filter plugins, and lookup plugins, but not inventory or connection plugins, so this was corrected to mention supported modules and Vault engines.
- The version pin used `>=5.0.0`, which is a minimum constraint rather than a reproducible pin. It was changed to the current documented collection version, `7.1.0`.
- The AppRole lookup example accessed `db_creds.data.username`, but the `hashi_vault` lookup returns the secret data dictionary by default for a KV v2 path. It was corrected to `db_creds.username`.
- The Kubernetes authentication example used `auth_method='kubernetes'`, which is not a supported `community.hashi_vault` auth method in the current documentation. It was changed to a JWT-auth example using a Kubernetes service account JWT.
- The `vault_write` example wrote generated credentials without `no_log`. The module documentation states that `data` may be logged, so `no_log: true` was added.
- The dynamic database credential example defined `lease_id` only as task-local vars in the template task, then used it in a later task. The later task was corrected to reference `db_creds.data.lease_id` directly.
- The environment variable example set Vault environment variables with Ansible's `environment:` keyword, which does not affect lookup plugins. It was changed to export the variables before running `ansible-playbook`.
- The error handling example referenced an undefined `vault_addr` variable and would fail before using its fallback value. A `vault_addr` var was added, the module now uses it, and the failure/fallback conditions were adjusted.

## Review Notes
- The `hashi_vault` lookup is still documented but the official docs recommend considering migration to newer collection plugins such as `vault_kv2_get` for KV v2 workflows.
- The examples remain illustrative and still require a reachable Vault server, valid policies, enabled auth methods, and existing secret paths or roles to run successfully.
