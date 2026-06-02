# Validation Summary: How to Use S3 with IAM Policies for Fine-Grained Access Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3
- AWS IAM policies
- AWS Organizations SCPs and RCPs
- S3 bucket policies
- IAM policy variables
- ABAC with IAM principal tags and S3 object tags
- AWS global and S3 condition keys
- AWS CLI IAM Policy Simulator

## Sources Consulted
- AWS IAM policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
- AWS enforcement code policy evaluation details: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
- AWS IAM explicit and implicit denies: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_AccessPolicyLanguage_Interplay.html
- AWS IAM policy variables and tags: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM global condition context keys, including `aws:MultiFactorAuthPresent`: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Amazon S3 actions, resources, and condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon S3 bucket policy examples using condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon S3 VPC endpoint bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- Amazon S3 bucket policy encryption examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- Amazon S3 POST policy documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
- AWS CLI `iam simulate-principal-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- Referenced OneUptime blog link: https://oneuptime.com/blog/post/2026-02-12-s3-bucket-ownership-controls/view

## Issues Found
- The policy evaluation section described SCP checks as happening after an explicit allow. Updated it to reflect AWS's documented evaluation model: explicit denies win, and applicable SCPs/RCPs, permissions boundaries, and session policies constrain whether an allow can become effective.
- The MFA write example used a conditional `Allow`, which would not enforce MFA if another policy allowed writes. Added an explicit deny using `BoolIfExists` with `aws:MultiFactorAuthPresent` set to `false`, matching AWS's recommended pattern, while keeping an allow for MFA-authenticated writes.
- The time-based access example used an access window that had already expired as of the validation date. Updated the example window to June 1, 2026 through December 31, 2026.
- The object-size example used `s3:content-length-range` as an IAM condition key. Replaced it with an S3 POST policy example because AWS documents `content-length-range` as a POST policy condition, not an IAM condition key.
- The VPC endpoint example was presented like a general IAM policy and used nonstandard casing for the condition key. Updated the text to call it a bucket policy, added `Principal: "*"`, and changed the condition key to the documented `aws:SourceVpce`.

## Review Notes
The remaining examples are syntactically valid JSON and align with current AWS documentation. In production, IP- and VPC-based explicit deny policies should be tested carefully to avoid locking out console, automation, or AWS service-to-service access paths.
