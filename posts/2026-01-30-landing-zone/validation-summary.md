# Validation Summary: How to Build Landing Zone

## Status
validated

## Post Type
Technical guide / Terraform tutorial

## Technologies Covered
- AWS Organizations
- AWS Service Control Policies
- AWS CloudTrail
- AWS Config
- AWS Security Hub
- Amazon GuardDuty
- Amazon S3
- AWS KMS
- Amazon CloudWatch Logs
- AWS Transit Gateway
- Amazon VPC
- AWS Resource Access Manager
- AWS IAM Identity Center
- Terraform AWS Provider

## Sources Consulted
- Terraform AWS Provider `aws_organizations_organization`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_organization.html.markdown
- Terraform AWS Provider `aws_organizations_account`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/organizations_account.html.markdown
- Terraform AWS Provider `aws_cloudtrail`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudtrail.html.markdown
- Terraform AWS Provider `aws_securityhub_organization_configuration`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/securityhub_organization_configuration.html.markdown
- Terraform AWS Provider `aws_guardduty_detector_feature`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector_feature.html.markdown
- Terraform AWS Provider `aws_guardduty_organization_configuration_feature`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_organization_configuration_feature.html.markdown
- Terraform AWS Provider `aws_config_organization_managed_rule`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/config_organization_managed_rule.html.markdown
- Terraform AWS Provider `aws_ec2_transit_gateway`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway.html.markdown
- Terraform AWS Provider `aws_ram_principal_association`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ram_principal_association.html.markdown
- Terraform AWS Provider `aws_ssoadmin_permission_set`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ssoadmin_permission_set.html.markdown
- AWS CloudTrail S3 bucket policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail organization trail preparation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-an-organizational-trail-prepare.html
- AWS CloudTrail KMS key policy documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html
- Amazon CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- AWS Config organization rule API documentation: https://docs.aws.amazon.com/config/latest/APIReference/API_PutOrganizationConfigRule.html
- AWS Config and AWS Organizations documentation: https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-config.html
- Amazon EC2 IAM example policies for IMDSv2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- AWS Security Hub `DisassociateFromMasterAccount` API note: https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_DisassociateFromMasterAccount.html
- Amazon GuardDuty API feature migration documentation: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-feature-object-api-changes-march2023.html

## Issues Found
- The project structure omitted `modules/logging`, `modules/identity`, and `environments/identity`, even though later snippets reference them. Added those directories to the structure.
- The AWS Organizations trusted access list omitted `config-multiaccountsetup.amazonaws.com`, which AWS Config organization rules use. Added it alongside `config.amazonaws.com`.
- The Security Hub SCP used only the older `DisassociateFromMasterAccount` action. Kept it because AWS says policies should continue to include it, and added `DisassociateFromAdministratorAccount` for the current API name.
- The GuardDuty SCP used `DisassociateFromMasterAccount`; updated it to `DisassociateFromAdministratorAccount`.
- The CloudTrail KMS policy incorrectly used the organization ID where an AWS account ID is required in the CloudTrail ARN encryption context. Changed it to use `var.management_account_id` and added an `aws:SourceArn` condition for the organization trail.
- The encrypted CloudWatch Logs group used the same KMS key, but the key policy did not grant CloudWatch Logs permission to use it. Added a CloudWatch Logs service-principal statement scoped by log group encryption context.
- The CloudTrail bucket policy used only `aws:SourceOrgID`; AWS recommends `aws:SourceArn`, and organization trail ARNs must use the management account ID. Updated the CloudTrail bucket policy statements to use the management account trail ARN and organization log prefixes.
- The CloudTrail resource did not explicitly depend on the bucket policy. Added `depends_on = [aws_s3_bucket_policy.central_logs]`.
- The GuardDuty examples used deprecated Terraform `datasources` blocks. Replaced them with `aws_guardduty_detector_feature` and `aws_guardduty_organization_configuration_feature`.
- The AWS Config organization managed rule snippet did not mention that configuration recorders must already exist in member accounts. Added that prerequisite note.
- The Transit Gateway section said the snippet configures route tables for hub-and-spoke connectivity, but it only creates the Transit Gateway route tables. Adjusted the wording to say the route tables can be associated with attachments.

## Review Notes
Terraform is not installed in the local environment, so `terraform validate` could not be run. The snippets were reviewed statically against official AWS documentation and current Terraform AWS Provider documentation.
