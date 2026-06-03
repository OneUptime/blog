# Validation Summary: How to Set Up AWS Organizations with Service Control Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Organizations
- Service Control Policies
- AWS CLI
- IAM policy syntax
- Amazon S3
- Amazon GuardDuty
- AWS CloudTrail
- AWS Config

## Sources Consulted
- AWS Organizations User Guide: Service control policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS Organizations User Guide: SCP syntax - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html
- AWS Organizations User Guide: SCP evaluation - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html
- AWS CLI Command Reference: organizations describe-effective-policy - https://docs.aws.amazon.com/cli/latest/reference/organizations/describe-effective-policy.html
- AWS CLI Command Reference: organizations list-policies-for-target - https://docs.aws.amazon.com/cli/latest/reference/organizations/list-policies-for-target.html
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon S3 API Reference: DeletePublicAccessBlock - https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeletePublicAccessBlock.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon GuardDuty - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonguardduty.html
- IAM User Guide: AWS global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html

## Issues Found
- The account-move example used `WORKLOADS_OU_ID` without defining it. Added a command to look up the Workloads OU ID after creating the child OU.
- The post said every account has `FullAWSAccess` attached by default. AWS documents that `FullAWSAccess` is attached to every root, OU, and account when created, so the wording was corrected.
- The S3 encryption SCP had a `Null` condition set to `"false"`, which meant requests missing the encryption header would not be denied. Removed that condition and clarified that the example requires clients to request approved server-side encryption explicitly.
- The public S3 SCP used the invalid `s3:DeletePublicAccessBlock` IAM action and a nonsensical `aws:PrincipalOrgID` self-comparison condition. Replaced it with `s3:PutBucketPublicAccessBlock`, which AWS documents as the permission required to create, modify, or delete bucket-level Block Public Access settings.
- The public S3 SCP overclaimed that it blocked all public access. Narrowed the description to public ACLs and bucket-level Block Public Access changes, and added `s3:PutObject` to cover uploads that include a public canned ACL.
- The `list-policies-for-target` explanation incorrectly said it lists inherited and directly attached SCPs. AWS documents that it lists only policies directly attached to the target, so the comment and follow-up guidance were corrected.
- The `describe-effective-policy --policy-type SERVICE_CONTROL_POLICY` example was invalid because AWS CLI documents `describe-effective-policy` for management policy types, not authorization policy types such as SCPs. Replaced it with `list-parents` guidance for tracing inherited SCP attachments.
- The break-glass condition key used `aws:PrincipalARN`; corrected it to the documented `aws:PrincipalArn`.

## Review Notes
- AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI documentation instead of local `--help` output.
- The embedded SCP JSON payloads were parsed with Node.js and all five policy documents are valid JSON.
- For broad S3 public-access governance, AWS now also supports organization-level S3 Block Public Access policies. That may be worth a future post update, but it was outside the scope of this SCP-focused correction.
