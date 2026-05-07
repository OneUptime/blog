# Validation Summary: How to Authenticate with AWS Using IAM Roles in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS STS
- AWS EC2 instance profiles
- AWS ECS task roles
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- AWS provider documentation (`assume_role` configuration): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS IAM trust policy guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html
- AWS IAM global condition keys (`aws:PrincipalArn`, `aws:RequestedRegion`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS cross-account policy evaluation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
- AWS IAM confused deputy guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
- AWS IAM instance profile guidance: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html
- Amazon EC2 instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS SDK assume role credential provider reference: https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html

## Issues Found
- The `assume_role` example used `duration_seconds`, which is outdated in current AWS provider/OpenTofu documentation. It was changed to `duration = "1h"` to match the current configuration format.
- The introduction said IAM roles could be assumed by “GitHub Actions runners, or any other AWS identity.” That wording was inaccurate because GitHub Actions is typically an external identity using web identity/OIDC, and EC2/ECS consume role credentials through instance profiles or task roles. The sentence was corrected to describe trusted principals, EC2 instance profiles, and ECS task roles accurately.
- The trust policy example used `StringEquals` for `aws:PrincipalArn` and described it as preventing confused deputy attacks. AWS documents `aws:PrincipalArn` as an ARN condition key and recommends ARN operators, and confused deputy mitigation is a different mechanism such as `sts:ExternalId` or `aws:SourceArn`/`aws:SourceAccount` depending on the scenario. The example was updated to use `ArnEquals`, and the comment was corrected.
- The post implied the trust policy alone was sufficient for cross-account role assumption. AWS requires the caller in the trusted account to also have an identity-based policy allowing `sts:AssumeRole`. A clarifying sentence was added below the trust policy example.
- The description and conclusion used absolute phrasing about being “credential-free” and eliminating static credentials entirely. Those statements were tightened to say the pattern avoids hard-coded credentials in OpenTofu configuration and uses temporary credentials.

## Review Notes
- The EC2 instance profile example is technically correct: the AWS provider can source credentials from the EC2 Instance Metadata Service automatically when OpenTofu runs on an EC2 instance with an attached instance profile.
- The post mentions ECS task roles in the description and conclusion but does not include a dedicated ECS example. That is acceptable for this post’s scope, but a future revision could add a short container-credentials example for completeness.
- The inline permission policy example is syntactically valid, but `aws:RequestedRegion` controls the requested service endpoint, not every possible cross-Region side effect. If the post later expands into IAM policy design, that nuance would be worth calling out explicitly.
