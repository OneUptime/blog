# Validation Summary: How to Get Started with HashiCorp Vault

## Status
validated

## Post Type
Tutorial / Getting started guide

## Technologies Covered
- HashiCorp Vault
- Vault CLI
- Vault KV v2 secrets engine
- Vault auth methods: token, userpass, AppRole
- Vault policies
- Vault database secrets engine for PostgreSQL
- Vault server configuration with integrated storage (Raft), TLS, AWS KMS auto-unseal, and telemetry
- Python hvac client
- Go HashiCorp Vault API client
- Node.js node-vault client

## Sources Consulted
- HashiCorp Vault installation documentation: https://developer.hashicorp.com/vault/docs/get-vault
- HashiCorp Vault configuration parameters: https://developer.hashicorp.com/vault/docs/configuration
- HashiCorp Vault integrated storage (Raft) backend documentation: https://developer.hashicorp.com/vault/docs/configuration/storage/raft
- HashiCorp Vault audit devices documentation: https://developer.hashicorp.com/vault/docs/audit
- HashiCorp Vault file audit device documentation: https://developer.hashicorp.com/vault/docs/audit/file
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault token create command documentation: https://developer.hashicorp.com/vault/docs/commands/token/create
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault userpass auth documentation: https://developer.hashicorp.com/vault/docs/auth/userpass
- HashiCorp Vault AppRole auth documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- Python hvac KV v2 documentation: https://python-hvac.org/en/stable/usage/secrets_engines/kv_v2.html
- Go HashiCorp Vault API client documentation: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- The post said audit devices log all requests and responses. HashiCorp documents that audit devices log requests and responses with a small set of exceptions, so I changed the wording to "most requests and responses, with a small set of exceptions" and adjusted the summary bullet accordingly.
- The production Raft configuration set `disable_mlock = false`. HashiCorp's integrated storage documentation strongly recommends setting `disable_mlock` to `true` when using Raft, so I updated the example and its comment.
- The production configuration comment described `api_addr` as the API address for cluster communication. HashiCorp documents `api_addr` as the advertised API address for client redirection and plugin backends, while `cluster_addr` is for cluster request forwarding, so I corrected the comment.
- The production configuration included an `audit { ... }` HCL block. HashiCorp's documented server configuration stanzas do not include an audit device stanza; audit devices are enabled with the `vault audit enable` command or API. I replaced the invalid block with a comment showing the correct `vault audit enable file file_path=/var/log/vault/audit.log` command.

## Review Notes
- The installation commands, dev server flow, KV v2 CLI examples, token/userpass/AppRole examples, policy syntax, PostgreSQL dynamic secrets example, and client code examples are consistent with the referenced documentation.
- The post includes example versions in sample Vault output. These are illustrative and not presented as the current latest Vault version.
