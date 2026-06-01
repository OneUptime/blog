# Validation Summary: How to Use IAM Policy Simulator to Test Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM Policy Simulator
- AWS CLI
- IAM policies, context keys, permissions boundaries, SCPs, and resource-based policies
- Amazon S3, Amazon EC2, CloudTrail, AWS Organizations, VPC endpoint policies, IAM Access Analyzer

## Sources Consulted
- AWS IAM User Guide: IAM policy testing with the IAM policy simulator: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html
- AWS CLI Command Reference: `iam simulate-principal-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI Command Reference: `iam simulate-custom-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html

## Issues Found
- The post said the simulator evaluates IAM policies the same way the AWS authorization engine does. AWS documents that simulator results can differ from the live AWS environment, so this was narrowed to evaluating IAM policies using the provided simulation inputs and supported scenarios.
- The post implied a matching statement is always shown. AWS documents that implicit denies do not have matching statement details, so this was qualified with "when a matching statement exists."
- The sample `MatchedStatements.SourcePolicyType` value was `"IAM Policy"`, which is not one of the documented API output values. It was changed to `"user-managed"`.
- The debugging section stated that failures after an "allowed" simulation could be caused by resource-based policies, SCPs, or permission boundaries without noting simulator support for some of these. It was updated to mention omitted resource policies, SCP conditions, and permissions boundaries not selected or provided for simulation.
- The limitations section incorrectly said the simulator does not evaluate resource-based policies, service control policies, or permissions boundaries. It was corrected to reflect AWS's documented limitations: resource-based policy simulation is supported only for specific services and not for IAM roles, SCPs with conditions are not evaluated, RCPs are not supported, VPC endpoint policies are not evaluated, and IAM roles and users are not supported for cross-account access simulation.

## Review Notes
The CLI command names, required flags, context key shorthand syntax, and custom policy simulation example match the current AWS CLI documentation. The scripting example is syntactically valid Bash, but production CI tests should include representative `--resource-arns` for each action to avoid validating against the default `*` resource when policies are resource-scoped.
