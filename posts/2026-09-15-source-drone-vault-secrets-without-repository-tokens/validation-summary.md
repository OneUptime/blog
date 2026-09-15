# Validation Summary: How to Source Drone Secrets from HashiCorp Vault Without Storing Long-Lived Tokens in Repositories

## Status

validated

## Post Type

Technical guide / security-focused CI/CD tutorial

## Technologies Covered

- Drone CI secret extensions and pipeline secrets
- HashiCorp Vault
- Vault AppRole authentication
- Vault KV v2 secrets engine
- Vault ACL policies
- Docker pipeline YAML

## Sources Consulted

- [Drone Vault extension installation](https://docs.drone.io/runner/extensions/vault/)
- [Drone external Vault secrets documentation](https://docs.drone.io/secret/external/vault/)
- [Official `drone/drone-vault` extension repository](https://github.com/drone/drone-vault)
- [Drone Vault extension request filtering implementation](https://github.com/drone/drone-vault/blob/master/plugin/plugin.go)
- [Drone Vault extension configuration and AppRole implementation](https://github.com/drone/drone-vault/blob/master/main.go)
- [HashiCorp Vault AppRole documentation](https://developer.hashicorp.com/vault/docs/auth/approle)
- [HashiCorp Vault AppRole HTTP API](https://developer.hashicorp.com/vault/api-docs/auth/approle)
- [HashiCorp Vault KV secrets engine documentation](https://developer.hashicorp.com/vault/docs/secrets/kv)
- [HashiCorp Vault `kv put` command documentation](https://developer.hashicorp.com/vault/docs/commands/kv/put)

## Issues Found

No technical issues found.

## Review Notes

- The post correctly uses the KV v2 API/policy path (`secret/data/ci/acme/api`) while using the mount-relative path (`ci/acme/api`) with `vault kv put -mount=secret`.
- The AppRole environment-variable names, token renewal settings, runner endpoint settings, Drone secret resource, access-control keys, and escaped `$$API_TOKEN` reference agree with the extension documentation and implementation.
- The `drone/drone-vault` repository's current `master` implementation supports `x-drone-disallow-forks` and `DRONE_DISALLOW_FORKS`, but the repository has seen limited recent activity. The post appropriately advises pinning and verifying the deployed image.
