# Validation Summary: How to Integrate HashiCorp Vault with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- Vault Agent
- AppRole authentication
- KV v2 secrets engine
- Portainer stacks
- Docker Compose
- Python
- `hvac`

## Sources Consulted
- HashiCorp Vault dev server docs: https://developer.hashicorp.com/vault/docs/concepts/dev-server
- HashiCorp Vault KV v2 setup docs: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- HashiCorp Vault KV CLI docs: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault KV v2 API docs: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault AppRole docs: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault AppRole API docs: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault auto-auth docs: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth
- HashiCorp Vault AppRole auto-auth docs: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/approle
- HashiCorp Vault agent CLI docs: https://developer.hashicorp.com/vault/docs/commands/agent
- HashiCorp Vault agent template docs: https://developer.hashicorp.com/vault/docs/agent/template
- `hvac` AppRole auth docs: https://python-hvac.org/en/stable/usage/auth_methods/approle.html
- `hvac` KV v2 docs: https://python-hvac.org/en/stable/usage/secrets_engines/kv_v2.html
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The original description claimed the guide was about dynamic secret management, but the tutorial actually demonstrates KV v2 static secret storage plus AppRole/Vault Agent integration. I changed the description to "centralized secret management" to match the implemented workflow.
- The original dev-mode stack mounted persistent volumes and set `VAULT_ADDR` to `http://0.0.0.0:8200`. Vault dev mode runs in-memory, so those mounts implied persistence that does not exist, and `0.0.0.0` is a bind address rather than a client endpoint. I removed the unused dev-mode volume mounts and the incorrect `VAULT_ADDR` environment variable.
- The original KV example used the common `secret/` mount name and path-style `vault kv` syntax. Current Vault CLI docs recommend the `-mount` form for KV v2, and reusing `secret/` can conflict with default/dev mounts. I switched the example to a dedicated `apps/` KV v2 mount and updated the commands to `vault kv put -mount=apps ...` and `vault kv get -mount=apps ...`.
- The original policy granted `list` on `secret/data/...` and then added a broad explicit `deny` on `secret/data/*`. For KV v2, list permissions apply to `metadata/` paths, and explicit `deny` takes precedence over allow rules. I replaced that policy with a narrow read-only rule on `apps/data/myapp/*`, which matches the access pattern shown in the post.
- The original AppRole example used `policies=myapp-policy`, which is deprecated in favor of `token_policies`, and it limited `token_num_uses`. Vault Agent auto-auth does not support limited-use tokens. I changed the role definition to use `token_policies=myapp-policy` and `secret_id_num_uses=10` instead.
- The original Vault Agent stack referenced `depends_on: vault` even though no `vault` service existed in that Compose file, and it mounted an empty named volume for `/vault/config` even though `vault agent -config=/vault/config/agent.hcl` requires a real config file. I removed the invalid dependency, changed the config mount to a bind-mounted `./vault-agent` directory, and clarified that the directory must contain `agent.hcl`, templates, and AppRole credential files.
- The original Python example authenticated with the dev root token even after the post created an AppRole for applications. I updated the example to use `client.auth.approle.login(...)` and to read the RoleID and SecretID from mounted files, while keeping the KV v2 read call aligned with the new `apps` mount.
- The original summary said the approach eliminates secrets from Compose files and environment variables entirely. That was too strong because Vault authentication material still has to be delivered securely. I corrected the summary to reflect that nuance.

## Review Notes
- The tutorial is intentionally development-oriented and still uses Vault dev mode plus `hashicorp/vault:latest`. For production, pin a Vault version, enable TLS, use a persistent storage backend, and deliver AppRole credentials through a stronger mechanism such as Portainer secrets or another trusted bootstrap path.
