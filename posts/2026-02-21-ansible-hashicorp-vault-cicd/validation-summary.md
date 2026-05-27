# Validation Summary: How to Use Ansible with HashiCorp Vault in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.hashi_vault Ansible collection
- HashiCorp Vault
- Vault AppRole authentication
- Vault KV v2 secrets engine
- Vault database secrets engine
- GitHub Actions
- Ansible Vault

## Sources Consulted
- Ansible community.hashi_vault collection index: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/index.html
- Ansible community.hashi_vault.hashi_vault lookup documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/hashi_vault_lookup.html
- Ansible community.hashi_vault lookup guide: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/docsite/about_hashi_vault_lookup.html
- Ansible community.hashi_vault migration guide: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/docsite/migration_hashi_vault_lookup.html
- Ansible community.hashi_vault.vault_login module documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/vault_login_module.html
- Ansible community.hashi_vault.vault_read module documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/vault_read_module.html
- Ansible community.hashi_vault.vault_kv2_get documentation: https://docs.ansible.com/ansible/latest/collections/community/hashi_vault/vault_kv2_get_module.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault AppRole API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault lease documentation: https://developer.hashicorp.com/vault/docs/concepts/lease

## Issues Found
- The Jinja2 template accessed `db_credentials.data.username`, `db_credentials.data.password`, and similar API key fields. The `community.hashi_vault.hashi_vault` lookup defaults to returning the secret dictionary for KV data, so these should be accessed directly. Updated the template to use `db_credentials.username`, `db_credentials.password`, `api_keys.stripe_key`, and `api_keys.sendgrid_key`.
- The dynamic database credentials example displayed lease metadata, but the default `hashi_vault` lookup return format only returns the response `data` field. Added `return_format='raw'` so `lease_id`, `lease_duration`, and `data.username`/`data.password` are all available.
- The cached-token example used `vault_read`, which returns the raw Vault response shape for KV v2, but the template task did not define the `db_credentials` and `api_keys` variables expected by the referenced template. Added task-level vars that map `db_secrets.data.data.data` and `api_secrets.data.data.data` to the template variables.
- The GitHub Actions example passed the SSH key through process substitution. The `ansible-playbook --private-key` option expects a private key file, so the workflow now writes the secret to a mode `0600` file and passes that file path.
- The best-practices section said to always use AppRole for automated pipelines. AppRole is appropriate for machine workflows, but "always" was too broad because Vault supports other non-human auth methods. Updated the wording to recommend a machine-oriented method such as AppRole.
- The lifecycle diagram said secrets are never stored on disk, but the tutorial writes rendered configuration files containing secrets. Updated the diagram to say secrets are not stored in code.
- The best-practices section recommended Vault namespaces without a caveat. Added wording that namespaces apply when the Vault edition supports them.

## Review Notes
The post still uses the legacy `hashi_vault` lookup for several examples. This is still documented, but the community.hashi_vault documentation recommends newer purpose-built lookups and modules, such as `vault_kv2_get`, for new KV v2 usage.
