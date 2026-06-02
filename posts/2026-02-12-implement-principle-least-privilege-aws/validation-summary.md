# Validation Summary: How to Implement the Principle of Least Privilege on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM policies, roles, permissions boundaries, and condition keys
- IAM Access Analyzer
- AWS CloudTrail policy generation
- AWS Organizations Service Control Policies (SCPs)
- AWS Config managed rules
- Terraform AWS provider
- AWS CLI

## Sources Consulted
- AWS IAM User Guide: IAM Access Analyzer overview and findings - https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html
- AWS IAM User Guide: Create an IAM Access Analyzer unused access analyzer - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-create-unused.html
- AWS IAM Access Analyzer API Reference: UnusedAccessConfiguration - https://docs.aws.amazon.com/access-analyzer/latest/APIReference/API_UnusedAccessConfiguration.html
- Terraform AWS provider: aws_accessanalyzer_analyzer - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/accessanalyzer_analyzer
- AWS CLI Command Reference: accessanalyzer start-policy-generation - https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- AWS IAM User Guide: IAM Access Analyzer policy generation - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html
- AWS IAM User Guide: Permissions boundaries for IAM entities - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM User Guide: Deny access based on requested Region - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- AWS IAM User Guide: Global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Service Authorization Reference: Amazon EC2 actions, resources, and condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS S3 User Guide: Specifying server-side encryption with AWS KMS - https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-kms-encryption.html
- AWS Config Developer Guide: iam-policy-no-statements-with-full-access - https://docs.aws.amazon.com/config/latest/developerguide/iam-policy-no-statements-with-full-access.html
- AWS Config Developer Guide: iam-user-unused-credentials-check - https://docs.aws.amazon.com/config/latest/developerguide/iam-user-unused-credentials-check.html
- Terraform AWS provider: aws_config_config_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Terraform AWS provider: aws_organizations_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy
- AWS Service Authorization Reference: Amazon GuardDuty actions - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonguardduty.html

## Issues Found
- The DynamoDB table and index resources in the first IAM policy example used malformed ARNs prefixed with `arn:aws:s3:::`. I corrected them to valid DynamoDB table and index ARNs.
- The AWS CLI `start-policy-generation` example nested `cloudTrailDetails` inside `--policy-generation-details`, but the CLI expects CloudTrail settings in the separate `--cloud-trail-details` option. I split the command into the correct CLI parameters.
- The permission boundary regional-deny example attempted to exclude global services with a condition on `aws:PrincipalArn`, which does not implement the AWS documented global-service exception pattern. I changed the statement to use `NotAction` with common global services, matching AWS guidance for `aws:RequestedRegion`.
- The EC2 `RunInstances` condition-key example used only the instance ARN as the resource. AWS documents that EC2 actions with required resource types must include all required resources when resource-level scoping is used, so I changed the example to `Resource = "*"`.
- The `aws:SourceVpc` explanation said secrets could only be accessed from within the VPC. AWS only includes this key when the request is made through a VPC endpoint, so I clarified the text to say access is through a VPC endpoint in the specified VPC.
- The AWS Config example claimed to detect wildcard policies but used the admin-access rule. I changed it to `IAM_POLICY_NO_STATEMENTS_WITH_FULL_ACCESS`, which detects unrestricted service wildcards such as `ec2:*`.

## Review Notes
- The IAM Access Analyzer unused-access snippet is valid for current Terraform AWS provider schemas, but unused-access analysis is billed separately and findings may take time to appear after analyzer creation.
- The AWS CLI and Terraform binaries were not installed in the local environment, so command and provider syntax were verified against official AWS and Terraform documentation rather than local help output.
