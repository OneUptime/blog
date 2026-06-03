# Validation Summary: How to Implement Vault Control Groups for Secret Approval Workflows

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault Enterprise control groups
- Vault ACL policies and identity groups
- Vault userpass auth method
- Vault Go API client
- Kubernetes Deployment, Service, and Ingress resources
- Vault audit logs
- Prometheus alert rules for custom dashboard metrics

## Sources Consulted
- HashiCorp Vault control groups documentation: https://developer.hashicorp.com/vault/docs/enterprise/control-groups
- HashiCorp Vault control group HTTP API: https://developer.hashicorp.com/vault/api-docs/system/control-group
- HashiCorp Vault control groups tutorial: https://developer.hashicorp.com/vault/tutorials/enterprise/control-groups
- HashiCorp Vault identity entities and groups tutorial: https://developer.hashicorp.com/vault/tutorials/auth-methods/identity
- HashiCorp Vault identity group HTTP API: https://developer.hashicorp.com/vault/api-docs/secret/identity/group
- HashiCorp Vault response wrapping documentation: https://developer.hashicorp.com/vault/docs/concepts/response-wrapping
- HashiCorp Vault unwrap HTTP API: https://developer.hashicorp.com/vault/api-docs/system/wrapping-unwrap
- HashiCorp Vault Go API package reference: https://pkg.go.dev/github.com/hashicorp/vault/api
- HashiCorp Vault telemetry documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry

## Issues Found
- The policy examples used `max_ttl`, but Vault control group ACL policies use `ttl`. Updated both policy snippets and the best-practices reference.
- The explanation said Vault unwraps and delivers the secret after approval. Updated it to clarify that Vault returns a response-wrapping token and the requester unwraps it after authorization.
- The approver setup implied userpass users automatically had named identity entities. Updated the commands to create identity entities, create aliases with the userpass mount accessor, and add those entity IDs to groups.
- The approver policy used `list` and `read` permissions against unsupported control group paths. Updated it to use `create` and `update` on `sys/control-group/request` and `sys/control-group/authorize`.
- The Go request code checked `WrappedAccessor` and used the accessor as the unwrap token. Updated it to check `WrapInfo.Token` and `WrapInfo.Accessor`, store the wrapping token, and unwrap with that token.
- The Go status polling code used a non-existent `sys/control-group/request/<accessor>` read path and fields not returned by the API. Updated it to write the accessor to `sys/control-group/request` and count returned authorizations.
- The dashboard code tried to list pending requests from Vault, but Vault's documented control group API checks status for a specific accessor and does not provide a list endpoint. Updated the example to use accessors collected by the application.
- The dashboard code imported `html/template` without using it. Removed the unused import.
- The Kubernetes example used plain HTTP for `VAULT_ADDR`. Updated it to an HTTPS service URL.
- The audit log example assumed response fields for timed-out control group requests. Updated it to query control group operations and failed unwrap attempts instead.
- The Prometheus section implied built-in Vault control group metrics. Updated the wording to make those metrics explicitly custom metrics exported by the approval dashboard.

## Review Notes
The examples are now aligned with the documented Vault control group API. A production dashboard still needs an explicit mechanism to collect and store wrapping accessors from requesters, because Vault does not expose a list-pending-control-group-requests API.
