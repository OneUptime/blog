# Validation Summary: How to Create Ansible Inventory from HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible dynamic inventory
- HashiCorp Vault KV v2 secrets engine
- HashiCorp Vault AppRole authentication
- Vault CLI and HTTP API
- Python requests
- jq

## Sources Consulted
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault KV secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/kv
- HashiCorp Vault AppRole API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault CLI kv put documentation: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault CLI write documentation: https://developer.hashicorp.com/vault/docs/commands/write
- Ansible dynamic inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible inventory CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- jq manual: https://jqlang.org/manual/

## Issues Found
- The `db01` host example set `ansible_port` to `5432`, which is the PostgreSQL service port rather than the SSH connection port Ansible uses. Changed it to `22` while keeping `db_port="5432"` as the database variable.
- The AppRole login Python snippet did not pass `X-Vault-Namespace`, even though the main request helper supports `VAULT_NAMESPACE`. Added the namespace header to the AppRole login request when configured.
- The Vault policy example used `list` on the KV v2 data path and referenced `ansible/credentials/*`, but KV v2 reads use `/data/` paths and listing uses `/metadata/` paths. Updated the policy to grant `read` on `ansible/data/groups/*`, `ansible/data/hosts/*`, and `ansible/data/credentials/*`, plus `list` on `ansible/metadata/groups` and `ansible/metadata/hosts`.
- The `jq` pipeline that patches the hosts list emitted JSON-encoded string output by default. Added `-r` so the patched Vault value is the intended JSON array string rather than an escaped JSON string literal.

## Review Notes
- Ansible currently recommends inventory plugins over scripts, but still supports executable inventory scripts through the script inventory plugin. The post's script-based approach remains technically valid.
- The credentials example writes SSH private keys to `/tmp` for simplicity. A production implementation should use a more carefully managed temporary file lifecycle and cleanup strategy.
