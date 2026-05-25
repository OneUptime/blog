# Validation Summary: How to Configure Consul Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Consul
- Terraform Consul provider
- Consul KV store
- Consul catalog services and nodes
- Consul ACL policies and tokens
- Consul service intentions and config entries
- Consul prepared queries
- TLS/mTLS provider configuration

## Sources Consulted
- HashiCorp Terraform Consul provider documentation: https://registry.terraform.io/providers/hashicorp/consul/latest/docs
- HashiCorp Terraform Consul provider source documentation: https://github.com/hashicorp/terraform-provider-consul
- Consul provider schema and environment variable support: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/index.md
- `consul_key_prefix` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/key_prefix.md
- `consul_keys` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/data-sources/keys.md
- `consul_service` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/service.md
- `consul_acl_token` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/acl_token.md
- `consul_config_entry` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/config_entry.md
- `consul_prepared_query` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-consul/main/docs/resources/prepared_query.md
- Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform version constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints

## Issues Found
- The `consul_service` example registered the service against the literal node name `"external-db-node"` while defining the `consul_node` separately. That HCL is syntactically valid, but Terraform would not infer an ordering dependency between the service and the node, so an apply could attempt to create the service before the catalog node exists. Changed `node = "external-db-node"` to `node = consul_node.external_db.name`, matching the official provider example pattern and creating the required dependency.

## Review Notes
The examples align with the current Consul provider documentation reviewed for provider configuration, environment variables, TLS files, KV resources/data sources, ACL policies/tokens, service-intentions config entries, prepared queries, and provider aliases. Terraform CLI is not installed in this environment, so local `terraform validate` could not be run.
