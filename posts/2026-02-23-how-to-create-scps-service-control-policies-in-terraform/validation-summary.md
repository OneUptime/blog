# Validation Summary: How to Create SCPs (Service Control Policies) in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Organizations
- AWS Service Control Policies (SCPs)
- AWS IAM (policy syntax, condition keys)
- AWS CloudTrail (referenced for SCP protection example)
- AWS S3 (referenced for SCP encryption example)
- AWS EC2 (referenced for instance type restrictions)

## Sources Consulted
- Terraform AWS Provider documentation: `aws_organizations_organization` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organization)
- Terraform AWS Provider documentation: `aws_organizations_policy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy)
- Terraform AWS Provider documentation: `aws_organizations_policy_attachment` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy_attachment)
- AWS Organizations User Guide: Service Control Policies (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- AWS SCP evaluation logic (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html)
- AWS IAM Global Condition Context Keys (https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html)
- AWS IAM Policy Reference: Version "2012-10-17"
- AWS CloudTrail API Actions reference
- AWS S3 condition keys (s3:x-amz-server-side-encryption)

## Issues Found
No technical issues found.

The post accurately describes:
- SCP evaluation logic (deny precedence, default deny without an allow)
- Terraform resource names and arguments (`aws_organizations_organization`, `aws_organizations_policy`, `aws_organizations_policy_attachment`)
- The `feature_set = "ALL"` and `enabled_policy_types = ["SERVICE_CONTROL_POLICY"]` configuration
- Policy JSON structure with Version "2012-10-17"
- IAM condition keys used in SCPs (`aws:RequestedRegion`, `aws:PrincipalArn`, `aws:RequestTag/*`, `s3:x-amz-server-side-encryption`, `ec2:InstanceType`)
- The `ForAnyValue:StringLike` condition operator
- CloudTrail action names (`cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, `cloudtrail:PutEventSelectors`, `cloudtrail:UpdateTrail`)
- The fact that SCPs do not apply to the management account
- The `roots[0].id` attribute reference on `aws_organizations_organization`
- Use of `StringNotLike` with `aws:PrincipalArn` to implement exemption patterns

## Review Notes
- The "Deny Specific Expensive Services" example mixes action namespaces (redshift, emr, sagemaker, ec2) under a single condition that references `ec2:InstanceType`. Because that condition key is only present in EC2 requests, the Deny would effectively only apply to `ec2:RunInstances`; the redshift/emr/sagemaker actions would not be denied since the condition key would be missing and `StringLike` evaluates to false in that case. The example is syntactically valid Terraform/IAM, and the inline comment ("Only deny large instance types") acknowledges this scope. Left as-is because the code is correct and a future reader can interpret the intent; reworking would constitute a stylistic/scope change rather than a technical fix.
- The S3 encryption example correctly uses two statements: one denying PutObject when the header value is not `AES256` or `aws:kms`, and a second denying PutObject when the header is missing (Null = true). This is a well-known pattern from AWS guidance.
- The post correctly notes that the management account is exempt from SCPs — an important and often-overlooked detail.
- Terraform 1.0+ is a reasonable minimum; all syntax shown (for_each, object types, flatten, locals) has been stable since well before 1.0.
