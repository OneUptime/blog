# Validation Summary: How to Handle Drift Detection in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform (formerly Terraform Cloud) Health Assessments / Drift Detection
- HCP Terraform API (`/workspaces`, `/assessment-results`, `/runs`)
- TFE Terraform provider (`tfe_workspace`, `tfe_notification_configuration`)
- Terraform core (`terraform plan`, `terraform apply`, `terraform import`, `lifecycle.ignore_changes`)
- AWS provider examples (`aws_instance`, `aws_security_group`, `aws_security_group_rule`, `aws_autoscaling_group`)
- Bash / curl / jq for API automation

## Sources Consulted
- [Health assessments in HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/health)
- [/assessment-results API reference for HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/assessment-results)
- [/workspaces API reference for HCP Terraform](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces)
- [/notification-configurations API reference](https://developer.hashicorp.com/terraform/enterprise/api-docs/notification-configurations)
- [tfe_notification_configuration provider docs](https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration)
- [tfe_organization_membership data source](https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/organization_membership)
- [Use health assessments to detect infrastructure drift tutorial](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-detection)
- HashiCorp issue trackers confirming `assessment:drifted` / `assessment:check_failure` triggers (e.g. hashicorp/terraform-provider-tfe issues #652, #926)

## Issues Found
1. **Incorrect plan tier for health assessments.** The post stated that drift detection is "available on the HCP Terraform Plus plan and above." Per the official HashiCorp documentation, health assessments are available on HCP Terraform **Standard** and **Premium** editions. Updated the wording to "Standard edition and above."
2. **Non-existent TFE provider data source.** The email notification example referenced `data.tfe_organization_members.admins.members[*].user_id`. There is no `tfe_organization_members` (plural) data source in the `hashicorp/tfe` provider; only the singular `tfe_organization_membership` data source exists (and it only returns a single membership). Replaced the value with a literal list of user IDs (`["user-abc123", "user-def456"]`), matching the documented type for `email_user_ids`.

## Review Notes
- The plural workspace endpoint `GET /api/v2/workspaces/:workspace_id/assessment-results` is valid (confirmed via HashiCorp docs/support content), so the curl examples are correct. There is also a singular `current-assessment-result` endpoint that could be used as an alternative for retrieving just the latest result.
- The `assessment:drifted` notification trigger is valid in current `hashicorp/tfe` provider versions; earlier provider versions did not support it.
- The `assessments_enabled` HCL attribute and `assessments-enabled` API attribute are both correct (HCL uses underscores, JSON:API uses kebab-case).
- The `aws_security_group_rule` import ID format used in Option 3 matches the AWS provider's documented format (`security_group_id_type_protocol_from_port_to_port_cidr_blocks`).
- HCP Terraform plan branding has shifted over time (Free/Standard/Plus/Business → Free/Standard/Plus/Premium → Free/Standard/Premium). The current wording ("Standard edition and above") should remain accurate even if Premium is renamed in the future.
