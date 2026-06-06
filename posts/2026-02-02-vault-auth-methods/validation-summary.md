# Validation Summary: How to Configure Vault Authentication Methods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (auth methods: token, userpass, AppRole, Kubernetes, LDAP, OIDC, JWT, AWS)
- Vault CLI (`vault` commands)
- Vault HCL password policies
- Vault Agent Injector (Kubernetes annotations)
- Python `hvac` client library
- Kubernetes (ServiceAccount, RBAC Role/RoleBinding, Deployment)
- GitHub Actions (`hashicorp/vault-action`)
- AWS IAM / EC2 instance metadata
- LDAP (Active Directory, OpenLDAP)
- OIDC (Okta, Auth0, Azure AD, Google Workspace)

## Sources Consulted
- Vault Auth Methods overview: https://developer.hashicorp.com/vault/docs/auth
- Vault AppRole API: https://developer.hashicorp.com/vault/api-docs/auth/approle
- Vault AppRole docs: https://developer.hashicorp.com/vault/docs/auth/approle
- Vault Kubernetes auth API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Vault LDAP auth API: https://developer.hashicorp.com/vault/api-docs/auth/ldap
- Vault OIDC/JWT auth API: https://developer.hashicorp.com/vault/api-docs/auth/jwt
- Vault AWS auth API: https://developer.hashicorp.com/vault/api-docs/auth/aws
- Vault password policy syntax: https://developer.hashicorp.com/vault/docs/concepts/password-policies
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- `hvac` Python client docs: https://hvac.readthedocs.io/
- `hashicorp/vault-action` GitHub repository: https://github.com/hashicorp/vault-action

## Issues Found
1. **Invalid AppRole endpoint in "Regular Credential Rotation" section.**
   The original snippet contained `vault write auth/approle/role/my-app/secret-id-num-uses num_uses=1`. No such endpoint exists in the AppRole API — `secret_id_num_uses` is a role-level parameter, not a sub-path. Fixed by writing the parameter to the role itself (`vault write auth/approle/role/my-app secret_id_num_uses=1`) and clarifying in comments that the rotated Secret ID inherits the role's `secret_id_ttl` and `secret_id_num_uses` settings.

## Review Notes
- The Kubernetes auth role examples use the `policies` parameter. This is still supported but is marked deprecated in the official API docs in favor of `token_policies`. Worth migrating in a future update, but not a correctness issue.
- The Vault password policy HCL syntax uses `length=16` (no spaces). HCL is whitespace-tolerant so this parses correctly; the canonical style in HashiCorp docs is `length = 16`, but both work.
- The `hashicorp/vault-action@v2` GitHub Action reference still works but is no longer the latest major. `@v3` and `@v4` are now available; consider bumping in a future revision.
- The Okta OIDC discovery URL example (`https://your-company.okta.com`) is acceptable for the Org Authorization Server; for a Custom Authorization Server, the path would be `https://your-company.okta.com/oauth2/<server-id>`. The example does not specify which is intended, but the value shown is valid for one common case.
- The OIDC role configuration intentionally specifies `allowed_redirect_uris` as repeated CLI flags — this is the documented, idiomatic Vault CLI pattern for list fields and was verified against the official Vault OIDC examples.
