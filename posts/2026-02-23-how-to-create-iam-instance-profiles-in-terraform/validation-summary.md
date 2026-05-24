# Validation Summary: How to Create IAM Instance Profiles in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (roles, policies, instance profiles)
- Amazon EC2 (instances, launch templates)
- AWS managed policies (AmazonS3ReadOnlyAccess, CloudWatchAgentServerPolicy, AmazonS3FullAccess)
- AWS IAM trust policies / STS AssumeRole
- AWS Secrets Manager, CloudWatch Logs, SNS, S3 (referenced in custom policy example)

## Sources Consulted
- Terraform AWS Provider `aws_iam_instance_profile` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/iam_instance_profile.html.markdown
- Terraform AWS Provider `aws_launch_template` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/launch_template.html.markdown
- Terraform AWS Provider `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_iam_role_policy`, `aws_iam_policy`, `aws_iam_policy_document` data source docs
- AWS IAM documentation on EC2 instance profiles and role trust policies
- AWS managed policy ARNs reference

## Issues Found
No technical issues found.

Specific items verified:
- The EC2 trust principal `ec2.amazonaws.com` and `sts:AssumeRole` action are correct.
- `aws_iam_instance_profile` supports `name`, `role`, `path`, and `tags` arguments — code uses them correctly.
- `aws_instance.iam_instance_profile` takes the instance profile name (not the role) — correctly used.
- `aws_launch_template.iam_instance_profile` block supports both `name` and `arn` (mutually exclusive) — correctly documented in the post.
- AWS managed policy ARNs (`AmazonS3ReadOnlyAccess`, `CloudWatchAgentServerPolicy`, `AmazonS3FullAccess`) are all valid.
- `jsonencode` policy with `Version = "2012-10-17"` and `Statement` structure is syntactically correct.
- `flatten`/nested `for` pattern for creating policy-attachment maps for `for_each` is idiomatic Terraform.
- Module pattern using `aws_iam_role.this.id` for the `role` argument of `aws_iam_role_policy` works (the ID of an `aws_iam_role` is its name).
- The "one role per instance profile" statement is correct per AWS IAM constraints.
- Propagation-delay caveat for instance profiles is a well-known AWS behavior.

## Review Notes
- The statement "The default maximum session duration for EC2 instance roles is one hour" refers to the IAM role's `max_session_duration` default (3600 seconds), which is accurate. Note that credentials served via the EC2 Instance Metadata Service (IMDS) are rotated automatically by AWS and are not directly bounded by this setting — the post's broader point about automatic rotation is correct.
- The example AMI ID `ami-0c55b159cbfafe1f0` is a commonly used illustrative Amazon Linux 2 AMI; readers should look up the current AMI ID for their region/AL2/AL2023 when applying this in practice.
- Terraform 1.0+ requirement is reasonable and matches current best practice for HCL2 features used (such as `for_each` with `toset`).
