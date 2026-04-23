# Validation Summary: How to Set Up RBAC for OpenTofu State Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu state backends
- Amazon S3
- AWS IAM policies, roles, and groups
- Amazon DynamoDB state locking
- Role-based access control (RBAC)
- CI/CD workload identity and trust policies

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu state documentation: https://opentofu.org/docs/language/state/
- OpenTofu 1.10 release notes (`use_lockfile` native S3 locking): https://opentofu.org/docs/v1.10/intro/whats-new/
- AWS IAM global condition keys (`aws:MultiFactorAuthPresent`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM `Principal` element and role trust policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM S3 prefix-based policy example: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_home-directory-console.html
- Amazon S3 logging options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/logging-with-S3.html
- Amazon S3 server access logging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html

## Issues Found
1. The description said the post used S3 bucket policies, but the examples actually used IAM identity policies. I changed the description to say IAM policies.
2. The RBAC diagram did not match the code examples: developers were shown as read-only while the group assignment granted write access, and the read-only role was shown for CI plan usage even though default `tofu plan` is not read-only. I updated the diagram to match a technically correct access model.
3. The `state_read_only` policy was labeled for plans, but OpenTofu documents that planning performs refresh and state locking, which means plan roles need backend write and lock permissions for the target state. I repurposed the read-only policy for audit/emergency inspection and added environment-scoped CI plan roles.
4. The DynamoDB permissions omitted `dynamodb:DescribeTable`, which OpenTofu documents as required for S3 backend locking with DynamoDB. I added `DescribeTable` to the write policies.
5. The post referenced `aws_iam_policy.state_write_staging` but never defined it. I added the missing staging policy.
6. The production write policy allowed unrestricted `s3:ListBucket` access and used an MFA-based deny that would also block typical automated CI/CD role sessions. I scoped `ListBucket` to the production prefix and moved the MFA guidance to human break-glass access in the best-practices section.
7. The IAM role trust policy used `ec2.amazonaws.com` while the text described generic CI/CD roles. I kept the example but added a clarifying note that it is for EC2-hosted runners and must be replaced with the real trusted principal, such as OIDC, in production setups.
8. The senior engineers group was shown as having dev and staging access in the model, but only staging was attached in code. I added the missing dev policy attachment.

## Review Notes
- The post uses DynamoDB-based state locking, which remains supported in current OpenTofu releases. OpenTofu 1.10+ also supports native S3 locking via `use_lockfile`, so that is an alternative readers may consider.
- AWS documentation recommends CloudTrail for S3 bucket-level and object-level action logging; S3 server access logging is still valid, and the post's recommendation to use both is technically acceptable.
