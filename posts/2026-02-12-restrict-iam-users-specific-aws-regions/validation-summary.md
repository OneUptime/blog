# Validation Summary: How to Restrict IAM Users to Specific AWS Regions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM condition keys and policy JSON
- AWS Organizations Service Control Policies (SCPs)
- IAM permissions boundaries
- AWS CLI
- Boto3 / Botocore
- Amazon EC2 API
- AWS CloudTrail
- Amazon Athena SQL

## Sources Consulted
- AWS IAM: Denies access to AWS based on the requested Region: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- AWS IAM: Global condition context keys (`aws:RequestedRegion`, `aws:CalledVia`, `aws:ViaAWSService`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM: Condition operators and missing-key behavior: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS Control Tower: Region deny control SCP example: https://docs.aws.amazon.com/controltower/latest/controlreference/primary-region-deny-policy.html
- AWS CLI `iam create-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- AWS IAM: Create IAM policies with AWS CLI: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-cli.html
- Boto3 EC2 `describe_instances` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instances.html
- Amazon Athena: Create a table for CloudTrail logs: https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table.html
- AWS WAF V2 authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awswafv2.html
- AWS WAF V2 API scope guidance: https://docs.aws.amazon.com/waf/latest/APIReference/API_GetSampledRequests.html

## Issues Found
- The first IAM policy included an `aws:CalledVia` CloudFormation exception using `ForAnyValue:StringNotLike`. `aws:CalledVia` is only present for forward access sessions and is multivalued, so this exception was not a reliable general CloudFormation region exception. Removed it from the simple deny policy and added the AWS-documented caveat that the policy does not grant permissions by itself.
- The "more practical" IAM policy had broad `Allow` statements for all actions in approved regions and for global services. As a region restriction policy, this could overgrant permissions when attached to users or groups. Replaced it with a deny-only `NotAction` pattern that matches AWS's documented region restriction approach.
- The Python test helper accepted `role_name` and created an STS client but never assumed or used that role. Updated the helper to describe that it tests the current credentials and removed the unused parameter/client.

## Review Notes
The SCP examples are structurally consistent with AWS's documented region deny controls. The global-service exception list should still be tailored per account, especially for services with both global and regional modes such as AWS WAF V2.
