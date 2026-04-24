# Validation Summary: How to Deploy Vault (HashiCorp) via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker / Docker Compose stack syntax
- HashiCorp Vault
- Vault CLI
- Vault KV v2 secrets engine
- Vault ACL policies
- Vault audit logging

## Sources Consulted
- HashiCorp Vault Docker image documentation: https://hub.docker.com/r/hashicorp/vault/
- Vault storage configuration: https://developer.hashicorp.com/vault/docs/configuration/storage
- Vault `operator init` command: https://developer.hashicorp.com/vault/docs/commands/operator/init
- Vault `operator unseal` command: https://developer.hashicorp.com/vault/docs/commands/operator/unseal
- Vault `login` command: https://developer.hashicorp.com/vault/docs/commands/login
- Vault `kv` command reference: https://developer.hashicorp.com/vault/docs/commands/kv
- Vault KV v2 setup: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- Vault KV v2 HTTP API: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault `policy write` command: https://developer.hashicorp.com/vault/docs/commands/policy/write
- Vault `audit enable` command: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- Docker `docker container exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Portainer relative path support: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer stack deployment options: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The stack used `VAULT_DEV_ROOT_TOKEN_ID` and `VAULT_LOCAL_CONFIG` while also starting Vault with `vault server -config=/vault/config/vault.hcl`. `VAULT_DEV_ROOT_TOKEN_ID` is for dev mode, and `VAULT_LOCAL_CONFIG` is written to `/vault/config/local.json` by the image entrypoint, which conflicts with the read-only `/vault/config` mount. I removed both and kept a single file-based server configuration.
- The stack mounted `./vault-config:/vault/config:ro`. Portainer relative path support is only available in the Business Edition Git deployment flow when explicitly enabled, so this was too broad for a general Portainer guide. I changed it to an absolute host path and updated the config-file instructions accordingly.
- The configuration example described itself as production-oriented while using the `file` storage backend and `tls_disable = 1`, which HashiCorp does not recommend for production. I relabeled the example as a single-node configuration and corrected the conclusion to point readers toward Raft integrated storage for production and HA use.
- The post showed audit logging as an `audit` block inside `vault.hcl`, but Vault audit devices are enabled at runtime with `vault audit enable`. I removed the invalid config and added the correct CLI command.
- The login example used `vault login` while only setting `VAULT_TOKEN` for the process. Vault documents `vault login` as reading the token from stdin by default unless a token is provided as an argument. I changed the example to pass the token explicitly.
- The KV examples used the deprecated path-like syntax for KV v2. I updated them to the current `-mount=secret` form documented by Vault.
- The policy example wrote a file to host `/tmp` and then tried to reference that path from inside the container with `docker exec`, which would not work. I changed it to pipe the policy over stdin with `docker exec -i`.
- The policy path was `secret/data/myapp/*`, but the tutorial stores and reads the secret at `secret/data/myapp`. I corrected the ACL path to the exact secret path used by the rest of the post.
- The API example used a fixed `http://vault:8200` endpoint. I changed it to `$VAULT_ADDR` so the request matches the configured Vault address rather than assuming a specific Docker network hostname.

## Review Notes
- No remaining technical errors were found after the fixes above.
- `image: hashicorp/vault:latest` is valid, but pinning to a tested image tag would make the tutorial more reproducible.
- The examples still use command-line placeholders for unseal keys and the root token. Vault supports this, but operators should avoid exposing real secret material in shell history in production workflows.
