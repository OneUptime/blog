# Validation Summary: How to Handle Multi-Cloud IAM with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (roles, policies, managed policies, SAML federation)
- AWS CloudWatch Events / EventBridge
- Azure AD (azuread provider) — groups
- Azure RBAC (azurerm provider) — role assignments, subscriptions
- GCP IAM — service accounts, project IAM bindings, audit logging
- GCP Workload Identity Federation (AWS provider)
- Terraform providers: hashicorp/aws ~> 5.0, hashicorp/azurerm ~> 3.0, hashicorp/azuread ~> 2.0, hashicorp/google ~> 5.0

## Sources Consulted
- AWS STS API Reference — AssumeRoleWithSAML: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithSAML.html
- AWS IAM User Guide — SAML 2.0 federation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_saml.html
- Terraform Registry — google_iam_workload_identity_pool_provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider
- Terraform Registry — google_service_account: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account
- Terraform Registry — azurerm_role_assignment: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Terraform Registry — azuread_group: https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/group
- GCP Workload Identity Federation — principal identifiers: https://cloud.google.com/iam/docs/workload-identity-federation
- GCP IAM audit logging: https://cloud.google.com/iam/docs/audit-logging
- AWS re:Post — EventBridge rule for IAM events only triggers in us-east-1: https://repost.aws/knowledge-center/eventbridge-rule-triggers-iam-single-region

## Issues Found
1. **AWS IAM SAML trust policy action was incorrect.** In the `aws_iam_role.multi_cloud` resource, the `assume_role_policy` used `Action = "sts:AssumeRole"` even though the principal was a SAML provider (`Federated = "...:saml-provider/corporate-idp"`) with a `SAML:aud` condition. For SAML federation, the correct action is `sts:AssumeRoleWithSAML`; the original would have failed to authenticate any SAML assertion. Changed to `sts:AssumeRoleWithSAML`.

## Review Notes
- The `google_service_account` resource genuinely does not support `labels` or `tags`, so the "Apply tags to GCP resources" example correctly omits them — though the section header is slightly misleading for that one resource. Not a technical error, just a minor framing nit.
- `aws_cloudwatch_event_rule` with `source = ["aws.iam"]` is only useful in `us-east-1` because IAM is a global service that emits events only to the default event bus in that region. The post's `provider "aws"` is already configured for `us-east-1`, so the example is functionally consistent, but readers running in other regions should be aware they need to route or create the rule in us-east-1.
- `google_project_iam_audit_config` correctly uses `ADMIN_READ` and `DATA_WRITE` log types. `ADMIN_WRITE` is always-on and is not configurable, so it is correctly omitted.
- Provider version pins (`azurerm ~> 3.0`, `azuread ~> 2.0`, `google ~> 5.0`, `aws ~> 5.0`) are older major lines but still functional. Newer major versions exist (azurerm 4.x, azuread 3.x, google 6.x, aws 6.x), and readers may want to bump these to pick up bug fixes; no breaking changes affect the snippets shown.
- The Workload Identity Federation example uses a broad `principalSet://.../*` binding allowing any AWS identity in the account to impersonate the GCP service account. In production, scoping with `principal://.../subject/<AWS-role-arn>` is safer.
