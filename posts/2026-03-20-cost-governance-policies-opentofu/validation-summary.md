# Validation Summary: How to Implement Cost Governance Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL variable validation)
- Terraform AWS provider (`aws_config_config_rule`, `aws_config_remediation_configuration`, `aws_organizations_policy`, `aws_organizations_policy_attachment`)
- AWS Config (managed rules `DESIRED_INSTANCE_TYPE`, `EC2_EBS_ENCRYPTION_BY_DEFAULT`, custom Lambda rules)
- AWS Organizations Service Control Policies (SCPs)
- AWS Systems Manager Automation runbooks
- IAM policy / SCP JSON syntax

## Sources Consulted
- AWS Config managed rule reference — DESIRED_INSTANCE_TYPE: https://docs.aws.amazon.com/config/latest/developerguide/desired-instance-type.html
- AWS Config managed rule reference — EC2_EBS_ENCRYPTION_BY_DEFAULT: https://docs.aws.amazon.com/config/latest/developerguide/ec2-ebs-encryption-by-default.html
- Terraform AWS provider — `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS provider — `aws_config_remediation_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_remediation_configuration
- Terraform AWS provider — `aws_organizations_policy` and `aws_organizations_policy_attachment`
- AWS Systems Manager Automation Runbook Reference: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-runbook-reference.html
- OpenTofu 1.9 CHANGELOG (cross-variable validation references)
- AWS sample for Config tagging remediation: https://github.com/aws-samples/aws-config-tagging-remediation-example

## Issues Found
- **Incorrect SSM Automation document name** in the "Automated Remediation" section (`README.md:153`). The post used `AWS-AddTagsToResource`, which is not a real AWS-managed Systems Manager Automation runbook. `AddTagsToResource` exists as an SSM API action but not as an `AWS-*` automation document. The canonical AWS-managed runbook used with `aws_config_remediation_configuration` for tagging non-compliant resources flagged by the `required-tags` Config rule is `AWSConfigRemediation-AddTagsToResource`. Updated `target_id` accordingly.

## Review Notes
- The OpenTofu variable validation example references `var.environment` from inside `var.instance_type`'s `validation` block. Cross-variable references in `validation` blocks require **OpenTofu >= 1.9** (or Terraform >= 1.9). Users on older OpenTofu/Terraform versions will see an error. This is not incorrect for current OpenTofu but is a version caveat that could be called out for readers on older toolchains.
- `EC2_EBS_ENCRYPTION_BY_DEFAULT` is a periodic-trigger Config rule (default 24h). The example does not set `maximum_execution_frequency`, which is acceptable since AWS Config will use its default cadence.
- The `aws_config_remediation_configuration` snippet shows only `AutomationAssumeRole` as a parameter; in practice the `AWSConfigRemediation-AddTagsToResource` runbook also requires inputs like `ResourceID` (typically supplied via a `resource_value` parameter referencing `RESOURCE_ID`) and the tag key/value list. The post is presented as an illustrative snippet rather than a complete production config, so this is left as-is.
- The SCP `Resource` field uses a single string (`"arn:aws:ec2:*:*:instance/*"`) rather than a list — both are valid in IAM/SCP JSON.
- All AWS Config managed rule identifiers (`DESIRED_INSTANCE_TYPE`, `EC2_EBS_ENCRYPTION_BY_DEFAULT`) and parameter names (`instanceType`) verified correct against official AWS documentation.
- All Terraform AWS provider resource names and argument names verified correct against current (v5) provider documentation.
