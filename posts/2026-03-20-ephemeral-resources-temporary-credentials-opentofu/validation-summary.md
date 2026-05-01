# Validation Summary: How to Use Ephemeral Resources for Temporary Credentials in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider
- Vault Provider
- Kubernetes Provider
- TLS Provider
- AWS Secrets Manager
- Amazon RDS
- AWS STS / OIDC

## Sources Consulted
- OpenTofu ephemerality overview: https://opentofu.org/docs/language/ephemerality/
- OpenTofu ephemeral resources: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu write-only attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `tofu state show`: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `tofu state pull`: https://opentofu.org/docs/v1.11/cli/commands/state/pull/
- Vault provider `vault_aws_access_credentials` ephemeral docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/aws_access_credentials.html.md
- Vault provider `vault_kv_secret_v2` ephemeral docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/kv_secret_v2.html.md
- AWS provider `aws_secretsmanager_secret_version` ephemeral docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_secretsmanager_secret_version` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- AWS provider configuration docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- Kubernetes provider `kubernetes_token_request_v1` ephemeral docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/ephemeral-resources/kubernetes_token_request_v1.md
- Kubernetes provider docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- Kubernetes provider `kubernetes_config_map_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/config_map_v1.md
- TLS provider `tls_private_key` ephemeral docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/docs/ephemeral-resources/private_key.md

## Issues Found
- The post treated ephemeral resources as if they were available in all OpenTofu versions and only during `apply`. I corrected the version requirement to OpenTofu `v1.11+` and updated the lifecycle wording to match the docs: ephemeral resources can participate in plan/apply, may be deferred to apply, and are not stored in state or plan.
- The Vault example used `ttl` and `security_token` without declaring STS-style credentials. I added `type = "sts"` so the example matches the documented `vault_aws_access_credentials` behavior.
- The RDS example passed an ephemeral value into the normal `password` argument of `aws_db_instance`, which OpenTofu does not allow. I changed it to the documented write-only fields `password_wo` and `password_wo_version`, and added the minimum required RDS arguments so the snippet is technically viable.
- The Kubernetes example used the wrong ephemeral resource name (`kubernetes_token_request` instead of `kubernetes_token_request_v1`) and tried to place the ephemeral token into a normal resource argument, which would be stored in state. I changed it to the documented `_v1` resource and used the token in Kubernetes provider configuration, which is an allowed ephemeral context.
- The SSH example tried to pass an ephemeral public key into `aws_key_pair.public_key`, which is not a write-only attribute and therefore cannot consume ephemeral values. I replaced the example with a valid pattern: generate the SSH key ephemerally and store the private key through the documented `secret_string_wo` write-only field in Secrets Manager.
- The CI/CD OIDC example referenced a nonexistent `github_actions_oidc_token` ephemeral resource. I replaced it with the documented AWS provider `assume_role_with_web_identity` flow using an ephemeral input variable, which is how a GitHub Actions OIDC token would realistically enter OpenTofu.
- The state inspection section assumed a local `terraform.tfstate` file and claimed the state was safe to inspect. I updated it to `tofu state pull`/`tofu state show` and clarified that ephemeral values themselves are absent from state, but other sensitive values may still be present.

## Review Notes
- This post now reflects the OpenTofu `v1.11+` ephemerality model and provider features that explicitly support ephemeral resources or write-only attributes. Older provider versions will not support these examples.
- The `OIDC Tokens for CI/CD` section necessarily uses an ephemeral variable rather than an ephemeral resource, because the AWS provider documents `assume_role_with_web_identity`, but the original `github_actions_oidc_token` resource does not exist in official provider documentation.
- The RDS and Secrets Manager write-only examples use companion version fields (`password_wo_version` and `secret_string_wo_version`). Those values must be changed deliberately when you want OpenTofu to send a new write-only value to the provider.
