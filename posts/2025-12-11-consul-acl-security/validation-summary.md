# Validation Summary: How to Configure Consul ACL for Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul ACLs
- Consul ACL policies, roles, and tokens
- Consul agent HCL configuration
- Consul CLI and HTTP API
- Consul service intentions
- Consul Enterprise audit logging
- Python Consul client usage
- Go Consul API client usage

## Sources Consulted
- HashiCorp Consul ACL configuration reference: https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/acl
- HashiCorp Consul ACL bootstrap guide: https://developer.hashicorp.com/consul/docs/secure/acl/bootstrap
- HashiCorp Consul ACL policy create CLI reference: https://developer.hashicorp.com/consul/commands/acl/policy/create
- HashiCorp Consul ACL token create CLI reference: https://developer.hashicorp.com/consul/commands/acl/token/create
- HashiCorp Consul ACL token update CLI reference: https://developer.hashicorp.com/consul/commands/acl/token/update
- HashiCorp Consul agent token API reference: https://developer.hashicorp.com/consul/api-docs/agent
- HashiCorp Consul agent service register API reference: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul config write CLI reference: https://developer.hashicorp.com/consul/commands/config/write
- HashiCorp Consul config list CLI reference: https://developer.hashicorp.com/consul/commands/config/list
- HashiCorp Consul audit logging documentation: https://developer.hashicorp.com/consul/docs/monitor/log/audit

## Issues Found
- The ACL configuration comment described `enable_token_persistence` as allowing replication of ACL data. HashiCorp documents this setting as persisting tokens set through the API to disk so agents reload them after restart. Updated the comment to match the documented behavior.
- The service intentions examples used `consul intention create` and `consul intention list`. HashiCorp documents `consul intention create` as deprecated since Consul 1.9.0 in favor of service-intentions config entries managed with `consul config`. Replaced the examples with `service-intentions` HCL entries and `consul config write/list` commands.
- The audit logging section did not mention that audit logging requires Consul Enterprise. Added that caveat before the configuration snippet.

## Review Notes
- Consul was not installed in the local environment, so CLI verification was performed against HashiCorp's current official command documentation rather than local `--help` output.
- The agent-token example uses a broad policy for illustration. HashiCorp's bootstrap guide recommends creating per-agent tokens with node identities for least-privilege production deployments.
