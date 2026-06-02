# Validation Summary: How to Implement Multi-Account Strategy on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Organizations
- Service Control Policies
- IAM Identity Center
- IAM roles and policies
- Amazon ECS
- AWS CodeDeploy
- AWS CloudTrail
- AWS Config
- Amazon S3 bucket policies
- AWS CloudFormation StackSets
- AWS Cost Explorer cost allocation tags
- Terraform AWS Provider
- Python boto3

## Sources Consulted
- AWS Organizations documentation: Service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations documentation: IAM Identity Center trusted access: https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-sso.html
- Amazon EC2 documentation: Example policies for RunInstances and IMDSv2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- IAM documentation: Single-valued vs. multivalued condition keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-single-vs-multi-valued-context-keys.html
- IAM documentation: Deny access based on requested Region: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_aws_deny-requested-region.html
- Amazon ECS Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
- AWS CodeDeploy Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscodedeploy.html
- AWS CloudTrail documentation: Amazon S3 bucket policy for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS Config documentation: S3 bucket permissions for the delivery channel: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-policy.html
- AWS CloudFormation API Reference: CreateStackInstances: https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStackInstances.html
- boto3 documentation: Organizations create_account: https://docs.aws.amazon.com/boto3/latest/reference/services/organizations/client/create_account.html
- AWS Billing documentation: Activating user-defined cost allocation tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- Terraform AWS Provider documentation: AWS Organizations organization resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_organization
- Terraform AWS Provider documentation: Cost allocation tag resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_allocation_tag

## Issues Found
- The GuardDuty SCP used `guardduty:DisassociateFromMasterAccount`, which is deprecated. Changed it to `guardduty:DisassociateFromAdministratorAccount`.
- The sandbox SCP used `ForAnyValue:StringNotLike` with `ec2:InstanceType`, a single-valued condition key. Changed it to `StringNotLike`.
- The CI/CD IAM policy applied one `aws:ResourceTag/Environment` condition to ECS task definition registration and deployment actions. Split the policy into action-specific statements using resource tags where supported and request tags for `ecs:RegisterTaskDefinition`.
- The centralized logging S3 policy did not include required CloudTrail and AWS Config bucket ACL/existence checks, did not require the `bucket-owner-full-control` ACL on delivered objects, and used nonstandard delivery prefixes. Updated it to include the required checks, delivery ACL condition, and AWSLogs prefixes for CloudTrail organization trails and Config delivery.

## Review Notes
The examples are still illustrative and assume variables such as `var.organization_trail_arn`, `var.org_id`, and account-specific providers are defined elsewhere. Region deny SCPs should be tested carefully because global AWS services can be affected by `aws:RequestedRegion` behavior. The two referenced OneUptime blog links resolve to AWS landing zone and cost governance posts.
