# Validation Summary: How to Configure the Consul Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- HashiCorp Consul (server v1.9+)
- HashiCorp Consul Provider for Terraform/OpenTofu (`hashicorp/consul`, ~> 2.20)
- Consul ACLs, KV store, service catalog, and service-intentions config entries

## Sources Consulted
- HashiCorp Consul Provider docs: https://registry.terraform.io/providers/hashicorp/consul/latest/docs
- Resource docs for `consul_keys`, `consul_node`, `consul_service`, `consul_acl_policy`, `consul_acl_token`, `consul_config_entry_service_intentions`, `consul_intention` on registry.terraform.io
- GitHub releases for `hashicorp/terraform-provider-consul` (latest verified: v2.23.0, Jan 2026)
- Consul environment-variable conventions (`CONSUL_HTTP_ADDR`, `CONSUL_HTTP_TOKEN`, `CONSUL_HTTP_SSL_VERIFY`, `CONSUL_NAMESPACE`)
- OpenTofu CLI docs (`tofu init/validate/plan/apply`)

## Issues Found

The original post was a generic placeholder: every code block referenced fictional `example_*` resources and a `hashicorp/example` provider source — none of it was actually about Consul. The title, intro, and conclusion advertised Consul-provider configuration, but the body contained no real Consul content. This made the post technically misleading rather than narrowly incorrect, so the body was rewritten end-to-end against the official Consul provider documentation while preserving structure, headings, author, tags, and tone.

Concrete corrections applied:

- Step 1 (provider block): replaced `hashicorp/example` with the real source `hashicorp/consul`, pinned to `~> 2.20`, and added accurate `address`, `scheme`, and `datacenter` arguments.
- Step 2 (auth): replaced fictitious `PROVIDER_API_KEY` / `PROVIDER_TOKEN` / `PROVIDER_ORG` env vars with the actual Consul env vars: `CONSUL_HTTP_ADDR`, `CONSUL_HTTP_TOKEN`, `CONSUL_HTTP_SSL_VERIFY`, `CONSUL_NAMESPACE`. Renamed variables to `consul_address` / `consul_token`.
- Step 3 (basic resources): replaced fake `example_project` / `example_team` with real `consul_keys` (using the documented `key` block with `path` and `value`), `consul_node` (required `name` + `address`), and `consul_service` (required `name` + `node`, with `port` and `tags`).
- Step 4 (advanced): replaced fake `example_alert` / `example_backup_policy` with real `consul_acl_policy` (using `name`, `description`, `datacenters`, `rules`), `consul_acl_token` (using `policies` as a Set of String, plus `description` and `local`), and `consul_config_entry_service_intentions` (using `name` for the destination and `sources` blocks for callers — replaces the legacy `consul_intention` resource that is no longer recommended for Consul 1.9+).
- Step 5 (outputs): replaced fake project outputs with `consul_acl_token.accessor_id` and `consul_service.id`. Added a note that the token secret is intentionally not in state and must be fetched via the `consul_acl_token_secret_id` data source.
- Conclusion: removed the duplicated phrasing ("configured How to Configure ... using OpenTofu") and made the closing sentence specific to Consul resources (KV, catalog, ACLs, mesh config entries).

The Step 6 deploy commands and the "Common Issues and Solutions" section were already accurate (`tofu init/validate/plan/apply` and generic IaC guidance), so they were kept and only lightly tightened to use Consul-specific terminology.

## Review Notes

- `consul_intention` still exists in the provider but the official docs explicitly recommend migrating to `consul_config_entry_service_intentions` for Consul 1.9+. The post uses the recommended resource and notes the replacement.
- `consul_keys` is fine for managing a small set of KV pairs, but for fully Terraform-managed prefixes the docs recommend `consul_key_prefix` (which removes drift). Worth mentioning in a future expansion of this guide.
- The provider also supports `auth_jwt` and `auth_login_aws` provider blocks for token issuance via JWT/AWS-IAM auth methods — useful for CI environments where a static `CONSUL_HTTP_TOKEN` is undesirable. Out of scope for this introductory guide.
- Provider version `~> 2.20` is appropriate as of May 2026; the latest release at validation time is v2.23.0. Pinning to the major version (`~> 2.0`) would also be acceptable.
- The `local = true` on `consul_acl_token` makes the token usable only in the local datacenter. For a token that should replicate, omit this argument or set `local = false`.
