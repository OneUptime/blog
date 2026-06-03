# Validation Summary: How to Use CloudFormation Stack Sets for Multi-Account Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudFormation StackSets
- AWS Organizations
- AWS CLI
- AWS IAM
- AWS CloudTrail
- Amazon S3 bucket policies

## Sources Consulted
- AWS CloudFormation: Activate trusted access for StackSets with AWS Organizations - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-activate-trusted-access.html
- AWS Organizations: CloudFormation StackSets and AWS Organizations - https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-cloudformation.html
- AWS CloudFormation: Create CloudFormation StackSets with service-managed permissions - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-associate-stackset-with-org.html
- AWS CloudFormation: Grant self-managed permissions - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html
- AWS CLI Command Reference: cloudformation create-stack-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack-set.html
- AWS CLI Command Reference: cloudformation create-stack-instances - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack-instances.html
- AWS CLI Command Reference: cloudformation update-stack-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack-set.html
- AWS CLI Command Reference: cloudformation list-stack-instances - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stack-instances.html
- AWS CloudFormation Template Reference: AWS::CloudTrail::Trail - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudtrail-trail.html
- AWS CloudTrail User Guide: Amazon S3 bucket policy for CloudTrail - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudFormation Template Reference: AWS Identity and Access Management resource types - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/AWS_IAM.html

## Issues Found
- The trusted-access CLI command used the member-account service principal, `member.org.stacksets.cloudformation.amazonaws.com`. Changed it to `stacksets.cloudformation.amazonaws.com`, which is the service principal used to enable trusted access for CloudFormation StackSets in AWS Organizations.
- The CloudTrail example created the same named multi-region trail in every StackSet target region. Changed it to a per-region trail name and `IsMultiRegionTrail: false`, so the example matches the later multi-region StackSet deployment command without colliding on a single account-wide multi-region trail.
- The CloudTrail trail could be created before its S3 bucket policy. Added `DependsOn: TrailBucketPolicy` so CloudFormation creates the bucket policy before creating the trail.
- The CloudTrail S3 bucket policy allowed writes to the whole bucket and omitted the recommended source condition. Updated the write resource to the CloudTrail `AWSLogs/${AWS::AccountId}` prefix and added `aws:SourceArn` conditions to the ACL check and write statements.
- The template included `AWS::IAM::AccountPasswordPolicy`, which is not an AWS CloudFormation IAM resource type. Removed that unsupported resource from the example.
- The StackSet operation preferences example used `MaxConcurrentPercentage=25` with `FailureTolerancePercentage=10`, which is misleading under the default strict failure tolerance behavior. Changed the max concurrency percentage to `10` and clarified that both percentages are evaluated per region.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI command reference pages and CloudFormation documentation rather than local `aws --help` output.
