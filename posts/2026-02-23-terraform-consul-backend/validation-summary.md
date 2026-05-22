# Validation Summary: How to Configure Consul Backend for Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Consul backend
- HashiCorp Consul KV store
- Consul ACL policies and tokens
- Consul sessions and Terraform state locking
- Consul TLS client configuration
- Consul CLI and HTTP API

## Sources Consulted
- Terraform Consul backend documentation: https://developer.hashicorp.com/terraform/language/backend/consul
- Terraform backend configuration and partial configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- Consul ACL rule configuration reference: https://developer.hashicorp.com/consul/docs/reference/acl/rule
- Consul CLI command reference: https://developer.hashicorp.com/consul/commands
- Consul KV get command documentation: https://developer.hashicorp.com/consul/commands/kv/get
- Consul Session HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/session
- Consul watch documentation: https://developer.hashicorp.com/consul/docs/automate/watch
- Consul monitor command documentation: https://developer.hashicorp.com/consul/commands/monitor
- Consul agent configuration limits documentation: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- Consul multi-datacenter federation documentation: https://developer.hashicorp.com/consul/docs/enterprise/federation
- Consul KV store overview: https://developer.hashicorp.com/consul/docs/dynamic-app-config/kv

## Issues Found
- The post claimed Consul provides "multi-datacenter replication" as a backend advantage. Consul's official multi-datacenter documentation says Consul generally does not replicate data between datacenters, aside from limited cases such as ACL replication or external replication tooling. Changed this to "Highly available within a datacenter, with multi-datacenter federation support."
- The state locking explanation said Terraform locks the state key itself. Terraform's Consul backend documentation states locking requires KV write permissions on `$path/.lock`. Updated the explanation to identify `$path/.lock`.
- The post used `consul session list` and `consul session destroy`, but the current official Consul CLI command reference does not include a `session` command. Replaced those commands with `consul kv get -detailed` for the lock key and the documented Session HTTP API destroy endpoint.
- The post included a `namespace` argument in the Terraform Consul backend block. Terraform's Consul backend documentation does not list `namespace` as a supported backend configuration option. Removed the namespace claim and commented argument from that section.
- The partial configuration example passed `access_token` through `-backend-config` and in a backend config file while saying this keeps sensitive values out of configuration files. Terraform documentation warns backend config values supplied this way are stored in `.terraform` and can appear in plan files. Updated the examples to use `CONSUL_HTTP_TOKEN` for the token and keep only non-sensitive backend settings in `-backend-config` and the config file.

## Review Notes
- The Consul backend page lists `access_token` as required, while the examples can still work against a local Consul development agent without ACLs. The post's framing now consistently treats tokens as required for production ACL-enabled clusters.
- The Consul KV 512 KB default limit, `gzip` backend option, ACL policy shape, TLS environment variables, `datacenter`, `lock`, `ca_file`, `cert_file`, `key_file`, `consul kv get -recurse`, `consul watch`, `consul monitor`, and `kv_max_value_size` examples were checked against official documentation and are technically correct.
