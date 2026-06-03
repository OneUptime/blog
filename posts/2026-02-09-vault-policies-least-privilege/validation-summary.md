# Validation Summary: How to configure Vault policies for least-privilege secret access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault ACL policies
- HashiCorp Vault KV v2 secrets engine
- HashiCorp Vault Database secrets engine
- HashiCorp Vault Transit secrets engine
- HashiCorp Vault Kubernetes auth method
- Vault audit devices
- Sentinel policy enforcement

## Sources Consulted
- HashiCorp Vault policy concepts: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault policy CLI command: https://developer.hashicorp.com/vault/docs/commands/policy
- HashiCorp Vault token capabilities CLI command: https://developer.hashicorp.com/vault/docs/commands/token/capabilities
- HashiCorp Vault KV v2 HTTP API: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault KV secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/kv
- HashiCorp Vault Database secrets engine API: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault /sys/audit API: https://developer.hashicorp.com/vault/api-docs/system/audit
- HashiCorp Vault audit enable CLI command: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- HashiCorp Vault Kubernetes auth method docs: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault access controls tutorial: https://developer.hashicorp.com/vault/tutorials/policies/policies
- HashiCorp support article on Vault policy globs and wildcards: https://support.hashicorp.com/hc/en-us/articles/38600861606931-Usage-of-Glob-and-Wildcard-in-Vault-Policies

## Issues Found
- KV v2 list permissions were granted on `secret/data/...` paths in several snippets. KV v2 listing requires `list` capability on `secret/metadata/...`, so the examples now separate read/write access on `data/` paths from list access on `metadata/` paths.
- The path matching section described `+` as a recursive wildcard. Vault's `+` wildcard matches one path segment, so the wording was corrected.
- The glob example used `secret/data/app-*/database`, but Vault policy globs are prefix/suffix style and `*` is only valid as a glob at the end of the policy path. The example now uses a valid prefix glob path.
- The required-parameters section required `ttl` on `database/creds/limited`, but the database credential generation endpoint only accepts the role name as a path parameter. The example now requires `default_ttl` when creating or updating a database role.
- The time-based access section implied ACL policy syntax could enforce business hours with `allowed_parameters`. ACL policies cannot express time windows directly; the section now states that Sentinel is required for time-based rules and shows only a narrow base ACL policy.
- The admin policy example used incomplete system paths and missed `sudo` where required. It now includes `sys/auth`, `sys/policies/acl`, and `sys/mounts` list paths, adds `sudo` to ACL policy management, and corrects the audit-device example to list enabled audit devices with `read` and `sudo`.
- The testing section included `vault policy test`, which is not a current Vault policy CLI subcommand. It was removed, leaving the supported `vault token capabilities` checks.

## Review Notes
The post assumes the KV secrets engine is mounted at `secret/` and uses KV v2 API paths. That is common in examples, but readers should adapt policy paths if their KV mount name or KV version differs.
