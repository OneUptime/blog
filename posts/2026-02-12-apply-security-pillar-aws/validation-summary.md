# Validation Summary: How to Apply the Security Pillar on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Framework Security pillar
- AWS IAM and IAM Identity Center
- AWS Organizations service control policies
- AWS CloudTrail
- Amazon GuardDuty
- AWS Security Hub
- Amazon VPC, security groups, and VPC endpoints
- AWS WAF
- AWS KMS and EBS encryption
- Elastic Load Balancing HTTPS listeners
- AWS Secrets Manager
- AWS Systems Manager Incident Manager
- Terraform AWS provider

## Sources Consulted
- AWS Well-Architected Framework Security pillar: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
- AWS shared responsibility model: https://aws.amazon.com/compliance/shared-responsibility-model/
- AWS IAM global condition key documentation for `aws:MultiFactorAuthPresent`, `aws:PrincipalArn`, and `aws:PrincipalIsAWSService`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Organizations SCP documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- Terraform AWS provider `aws_ssoadmin_instances` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssoadmin_instances
- Terraform AWS provider `aws_ssoadmin_permission_set`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set
- Terraform AWS provider `aws_ssoadmin_permission_set_inline_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_permission_set_inline_policy
- Terraform AWS provider `aws_ssoadmin_managed_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssoadmin_managed_policy_attachment
- Terraform AWS provider `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail `DataResource` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudtrail-trail-dataresource.html
- AWS GuardDuty feature API changes: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-feature-object-api-changes-march2023.html
- Terraform AWS provider `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- Terraform AWS provider `aws_securityhub_standards_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/securityhub_standards_subscription
- Terraform AWS provider `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Terraform AWS provider `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- Terraform AWS provider `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform AWS provider `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation

## Issues Found
- The IAM Identity Center Terraform example referenced `aws_ssoadmin_instance.main.arn`, but the Terraform AWS provider exposes IAM Identity Center instances through the `aws_ssoadmin_instances` data source rather than an `aws_ssoadmin_instance` resource. Replaced it with `data "aws_ssoadmin_instances" "main"` and a local `sso_instance_arn`.
- The developer permission set put `inline_policy` directly on `aws_ssoadmin_permission_set`, but inline policies are managed with `aws_ssoadmin_permission_set_inline_policy`. Moved the policy JSON into that resource.
- The MFA SCP wording implied that `aws:MultiFactorAuthPresent` can enforce MFA for IAM Identity Center users. AWS documents that this key is not present for federated identities, so the text now says to enforce IAM Identity Center MFA in Identity Center or the external IdP. The SCP example was narrowed for remaining IAM user or role access and updated to use `aws:PrincipalArn`, exclude AWS service principals, and avoid matching AWSReservedSSO roles.
- The GuardDuty Terraform example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with current `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS`, `EKS_AUDIT_LOGS`, and `EBS_MALWARE_PROTECTION`.
- The Security Hub CIS v1.4.0 ARN used the legacy `ruleset` ARN shape. Updated it to the documented regional `standards/cis-aws-foundations-benchmark/v/1.4.0` ARN and used `data "aws_region" "current"` for both standards subscriptions.

## Review Notes
- The remaining Terraform snippets are partial examples and still assume surrounding resources and variables exist, such as VPCs, subnets, route tables, security groups, KMS keys, ALBs, ACM certificates, CloudWatch log groups, and IAM roles.
- `terraform`, `tofu`, and `tflint` were not installed in the local environment, so I could not run a local HCL formatter or Terraform validation. Resource names, argument names, and version-sensitive examples were checked against current official AWS and Terraform AWS provider documentation instead.
