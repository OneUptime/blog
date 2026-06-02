# Validation Summary: How to Tag EC2 Resources for Cost Allocation and Organization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 tagging
- AWS CLI
- AWS Config managed rules
- AWS Organizations service control policies
- AWS Cost Explorer and cost allocation tags
- AWS Systems Manager maintenance windows
- IAM tag-based access control
- Terraform AWS provider
- jq

## Sources Consulted
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 User Guide: Grant permission to tag EC2 resources during creation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/supported-iam-actions-tagging.html
- Amazon EC2 User Guide: Example policies to control access the Amazon EC2 API - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- IAM User Guide: Conditions with multiple context keys or values - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-logic-multiple-context-keys-or-values.html
- AWS Config Developer Guide: required-tags managed rule - https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS CLI Command Reference: ce update-cost-allocation-tags-status - https://docs.aws.amazon.com/cli/latest/reference/ce/update-cost-allocation-tags-status.html
- AWS Billing User Guide: Activating user-defined cost allocation tags - https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- AWS CLI Command Reference: ssm create-maintenance-window - https://docs.aws.amazon.com/cli/latest/reference/ssm/create-maintenance-window.html
- AWS CLI Command Reference: ssm register-target-with-maintenance-window - https://docs.aws.amazon.com/cli/latest/reference/ssm/register-target-with-maintenance-window.html
- Terraform Registry: aws_instance resource tag guide - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp Developer: Configure default tags for AWS resources - https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags

## Issues Found
- The SCP example used one `Null` condition with three `aws:RequestTag` keys. IAM evaluates multiple context keys under the same condition operator with logical AND, so the policy would deny only when all three tags were missing. I split it into three deny statements so a launch is denied if any required tag is absent.
- The Systems Manager `create-maintenance-window` command omitted the required `--allow-unassociated-targets` or `--no-allow-unassociated-targets` option. I added `--no-allow-unassociated-targets`, which matches the following step that registers targets by tag.
- The SSM example comment said it created a patch baseline, but the command creates a maintenance window. I corrected the comment.

## Review Notes
- The Terraform `aws_instance` example is valid, but current AWS provider documentation notes that `default_tags` also apply to root and EBS block device volumes, while `volume_tags` applies volume-specific tags during creation.
- EC2 tag-on-create authorization may also require `ec2:CreateTags` permission in IAM policies when tags are supplied. The SCP example is a deny guardrail and does not grant the underlying permissions.
