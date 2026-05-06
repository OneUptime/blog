# Validation Summary: How to Configure the Consul Backend in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Consul
- Consul KV store
- Consul ACLs
- Consul audit logging
- HCL

## Sources Consulted
- OpenTofu Consul backend docs: https://opentofu.org/docs/language/settings/backends/consul/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu workspaces docs: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu state locking docs: https://opentofu.org/docs/v1.6/language/state/locking/
- OpenTofu `force-unlock` docs: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu Consul backend implementation for workspace and lock behavior: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/consul/backend_state.go
- OpenTofu Consul backend client implementation for `.lock`, `.lockinfo`, session TTL, and renewals: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/consul/client.go
- Consul KV command docs: https://developer.hashicorp.com/consul/commands/kv
- Consul `kv get` docs: https://developer.hashicorp.com/consul/commands/kv/get
- Consul ACL rule reference: https://developer.hashicorp.com/consul/docs/reference/acl/rule
- Consul audit logging docs: https://developer.hashicorp.com/consul/docs/monitor/log/audit
- Consul log parameter reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/log
- Consul Terraform provider `consul_acl_policy` docs: https://github.com/hashicorp/terraform-provider-consul/blob/main/docs/resources/acl_policy.md
- Consul Terraform provider `consul_acl_token` docs: https://github.com/hashicorp/terraform-provider-consul/blob/main/docs/resources/acl_token.md
- Consul Terraform provider `consul_acl_token_secret_id` docs: https://github.com/hashicorp/terraform-provider-consul/blob/main/docs/data-sources/acl_token_secret_id.md

## Issues Found
- The post used `consul_acl_token.opentofu_state.secret_id`, but the current `consul_acl_token` resource does not expose the generated secret ID in state. I replaced it with the `consul_acl_token_secret_id` data source and updated the output accordingly.
- The post used `consul kv ls`, which is not a valid Consul CLI subcommand. I replaced it with a supported `consul kv get -keys -separator=""` example.
- The lock explanation implied OpenTofu locked the main state key directly. I corrected this to the actual Consul backend behavior, which uses `$path/.lock` and stores lock metadata at `$path/.lockinfo`.
- The post recommended deleting the Consul lock key directly to clear a stuck lock. I replaced this with `tofu force-unlock <LOCK_ID>`, which is the documented OpenTofu mechanism.
- The workspace storage example claimed non-default workspaces are stored as `path-workspace`. I corrected this to the backend’s actual `path-env:<workspace>` naming.
- The environment variable section claimed all backend parameters can be set with environment variables. I narrowed this to common connection and TLS settings, which matches the official backend and Consul client behavior.
- The audit logging section omitted that audit logging is a Consul Enterprise feature with ACLs enabled and showed an incomplete file sink example. I corrected the text and added the required delivery and rotation settings.
- The prerequisite `Consul cluster running (1.0+)` was not supported by the current official backend docs and was too specific for the mixed feature set in the post. I removed the version claim.

## Review Notes
- Reading an ACL token SecretID through `consul_acl_token_secret_id` writes that secret into OpenTofu state unless you also configure `pgp_key`.
- OpenTofu documents that workspaces are not a substitute for separate credentials or stronger access boundaries.
- The Consul backend can split large state payloads across multiple KV entries, so raw KV listings may show additional chunk keys beyond the main state path.
