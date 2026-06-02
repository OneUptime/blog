# Validation Summary: How to Restrict IAM Users to Specific AWS Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM JSON policies
- AWS CLI
- IAM Access Analyzer
- AWS CloudTrail
- Boto3 for Python
- AWS service authorization actions and condition keys

## Sources Consulted
- AWS IAM JSON policy elements: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM JSON policy Condition element: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS global condition context keys, including `aws:RequestedRegion`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS requested Region policy example: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- AWS CLI IAM command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/
- AWS CLI Access Analyzer `start-policy-generation` reference: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- IAM Access Analyzer policy generation guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html
- AWS CloudTrail `LookupEvents` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_LookupEvents.html
- AWS CloudTrail `LookupAttribute` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_LookupAttribute.html
- AWS IAM PassRole guide: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html
- AWS IAM and AWS STS condition keys, including `iam:PassedToService`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS Service Authorization Reference for AWS Billing Console: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsbillingconsole.html
- AWS Service Authorization Reference for Amazon GuardDuty: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonguardduty.html
- Amazon S3 bucket creation and `LocationConstraint`: https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html

## Issues Found
- The DevOps / Platform Engineer policy used the statement ID `DenyIAMExceptPassRole`, but the policy did not actually allow `iam:PassRole`. I added a separate constrained `iam:PassRole` statement for deployment roles and specific service principals because AWS services such as CloudFormation, ECS, Lambda, and CodeBuild often require PassRole during deployments, and an explicit deny exception does not grant access by itself.
- The Access Analyzer CLI example started policy generation with only `--policy-generation-details`. For CloudTrail activity-based policy generation, AWS documents passing CloudTrail trail details and an access role. I added `--cloud-trail-details file://cloudtrail-details.json` to make the example match the documented CLI flow.
- The region restriction section described `aws:RequestedRegion` as a maximum-security control. AWS documents that this key controls the requested endpoint and does not control every regional side effect. I changed the wording to "additional guardrail" and added the S3 `CreateBucket` caveat that `s3:LocationConstraint` should be used to control bucket creation regions.

## Review Notes
- The IAM policy JSON snippets are syntactically valid.
- The IAM group commands use current AWS CLI operations and flags.
- The CloudTrail boto3 example uses valid `lookup_events` parameters, including `LookupAttributes`, `StartTime`, and `MaxResults=50`. It only returns the first page of results; pagination would be a useful future improvement.
- Several sample policies still use broad `Resource: "*"` and wildcard service actions for teaching simplicity. That is not technically incorrect for service-level examples, but production policies should usually narrow resources and add service-specific conditions where possible.
