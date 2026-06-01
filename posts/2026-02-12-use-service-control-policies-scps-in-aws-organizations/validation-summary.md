# Validation Summary: How to Use Service Control Policies (SCPs) in AWS Organizations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Organizations
- Service Control Policies (SCPs)
- AWS Identity and Access Management (IAM) policy syntax and condition operators
- AWS CLI
- Terraform AWS provider
- Amazon S3 server-side encryption policy conditions
- Amazon EC2 condition keys
- AWS CloudTrail

## Sources Consulted
- AWS Organizations User Guide: Service control policies (SCPs) - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations User Guide: SCP syntax - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html
- AWS Organizations User Guide: SCP evaluation - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html
- AWS Organizations User Guide: Quotas and service limits - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html
- AWS What's New: AWS Organizations increased SCP quotas, May 15, 2026 - https://aws.amazon.com/about-aws/whats-new/2026/05/aws-organizations-increased-scp-quotas/
- AWS IAM User Guide: Condition operators - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM User Guide: Single-valued vs. multivalued context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-single-vs-multi-valued-context-keys.html
- Amazon S3 User Guide: Using server-side encryption with Amazon S3 managed keys - https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html
- AWS Service Authorization Reference: Amazon EC2 condition keys - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS CLI Command Reference: organizations enable-policy-type - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/organizations/enable-policy-type.html
- AWS CLI Command Reference: organizations create-policy - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/organizations/create-policy.html
- AWS CLI Command Reference: organizations list-policies and list-policies-for-target - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/organizations/list-policies.html and https://awscli.amazonaws.com/v2/documentation/api/latest/reference/organizations/list-policies-for-target.html
- Terraform Registry: aws_organizations_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy

## Issues Found
- Clarified the opening SCP scope. The original text said SCPs set maximum permissions for every identity in an AWS account, including the root user. AWS documents that SCPs affect member accounts, including the member account root user, but not the management account. Updated the wording to say "member AWS account."
- Clarified entities affected by SCPs. AWS documents that SCPs can be attached to roots, OUs, and accounts, and that service-linked roles are not restricted by SCPs. Updated the "How SCPs Work" section accordingly.
- Corrected the default `FullAWSAccess` attachment scope. AWS attaches it to every root, OU, and account. The post previously mentioned only OUs and accounts.
- Fixed the S3 encryption SCP example. The `Null` condition set to `"false"` caused requests missing the `s3:x-amz-server-side-encryption` header not to match the Deny statement. Removed that condition so `StringNotEquals` denies missing or non-approved encryption headers, matching AWS's documented S3 encryption policy pattern.
- Fixed the EC2 instance type condition operator. `ec2:InstanceType` is a single-valued condition key, and AWS advises not using set operators such as `ForAnyValue` with single-valued keys. Changed `ForAnyValue:StringLike` to `StringLike`.
- Updated SCP quotas. AWS increased SCP document size from 5,120 to 10,240 characters and direct SCP attachments per root, OU, or account from 5 to 10 on May 15, 2026. Updated the limits section.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI Command Reference rather than local `aws help` output.
- The JSON policy snippets were parsed successfully after edits.
- The region restriction example is structurally valid, but the exact `NotAction` exception list should be tailored to the organization's AWS services, especially for global services and services that depend on `us-east-1`.
