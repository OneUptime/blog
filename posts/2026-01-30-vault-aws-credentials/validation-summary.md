# Validation Summary: How to Build Vault AWS Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (AWS secrets engine)
- AWS IAM, STS (assumed_role, federation_token, iam_user credential types)
- Vault Agent (Kubernetes sidecar injector)
- hvac (Vault Python client)
- boto3 (AWS Python SDK)
- Terraform Vault provider (`vault_aws_access_credentials` data source)
- AWS CLI

## Sources Consulted
- Vault AWS secrets engine API docs: https://developer.hashicorp.com/vault/api-docs/secret/aws
- hvac AWS secrets engine docs: https://python-hvac.org/en/stable/usage/secrets_engines/aws.html
- Terraform Vault provider `vault_aws_access_credentials` data source docs: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/d/aws_access_credentials.html.md
- HashiCorp Vault CLI command references (`vault secrets enable`, `vault write aws/config/root`, `vault write aws/roles/*`, `vault read aws/creds/*`, `vault lease renew`, `vault lease revoke`, `vault audit enable`, `vault policy write`, `vault list sys/leases/lookup/...`, `vault write sys/leases/lookup`)
- Vault Agent Kubernetes injector annotation docs (`vault.hashicorp.com/agent-inject`, `vault.hashicorp.com/role`, `vault.hashicorp.com/agent-inject-secret-*`, `vault.hashicorp.com/agent-inject-template-*`)

## Issues Found
No technical issues found.

All commands, parameter names, JSON policies, configuration paths, and code snippets verified against official documentation:

- `credential_type` values (`iam_user`, `assumed_role`, `federation_token`) and their associated parameters (`policy_document`, `policy_arns`, `role_arns`, `external_id`, `default_sts_ttl`, `max_sts_ttl`) are correct.
- `vault write aws/config/root` parameter names (`access_key`, `secret_key`, `region`) are correct.
- `vault write aws/config/lease` with `lease` and `lease_max` for IAM user credential defaults is correct.
- Vault lease management endpoints (`sys/leases/lookup`, `vault lease renew`, `vault lease revoke -prefix`) are accurate.
- Statement that STS credentials cannot be renewed (only IAM user credentials can) is correct.
- Output sample showing `lease_renewable false` for STS credentials and `security_token <nil>` for IAM user credentials is accurate.
- hvac calls: `client.auth.approle.login(role_id=..., secret_id=...)`, `client.secrets.aws.generate_credentials(name=...)`, and `client.sys.revoke_lease(...)` are valid.
- Terraform `vault_aws_access_credentials` data source with `backend`, `role`, and `type = "sts"` (yielding `access_key`, `secret_key`, `security_token`) is correct.
- Vault Agent injector annotations and template syntax (`{{ with secret "..." }} ... {{ end }}`) are correct.

## Review Notes
- Vault's AWS secrets engine also supports a fourth credential type, `session_token` (newer addition for generating STS GetSessionToken credentials, useful for MFA scenarios). The post states "Vault supports three types" and focuses on the three most commonly used types. This is a minor coverage gap rather than a technical inaccuracy in what is presented; expanding to mention `session_token` in a future revision could improve completeness.
- The IAM permissions policy listed for the Vault root credentials covers the main IAM user lifecycle actions but does not include `iam:GetUser`, `iam:AddUserToGroup`, `iam:RemoveUserFromGroup`, or `iam:ListGroupsForUser`. These are only required if Vault is configured to manage IAM group membership via the `iam_groups` role parameter. For the basic flow shown in the post, the listed permissions are sufficient.
- The `aws/config/lease` endpoint applies only to IAM user credentials. For STS credentials (`assumed_role`/`federation_token`), TTLs must be set per-role via `default_sts_ttl`/`max_sts_ttl`, which the post correctly demonstrates.
- The post is current as of Vault 1.x APIs; no deprecated paths or parameters detected.
