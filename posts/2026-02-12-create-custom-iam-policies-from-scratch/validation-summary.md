# Validation Summary: How to Create Custom IAM Policies from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM JSON policies
- Amazon S3 permissions and ARNs
- Amazon EC2 permissions, tags, and condition keys
- Amazon DynamoDB permissions and ARNs
- Amazon SQS permissions and ARNs
- AWS CLI IAM commands
- IAM Policy Simulator

## Sources Consulted
- AWS IAM JSON policy element reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM Condition element documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html
- AWS IAM condition operators documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
- AWS IAM single-account deny/allow evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
- AWS IAM and STS quotas: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS managed policy reference for AmazonS3FullAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonS3FullAccess.html
- AWS managed policy reference for AmazonEC2FullAccess: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEC2FullAccess.html
- Amazon S3 policy language overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html
- Amazon S3 IAM integration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS CLI create-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- AWS CLI create-policy-version command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy-version.html
- AWS CLI simulate-custom-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html

## Issues Found
- The conditions example was described as "business hours," but the IAM `DateGreaterThan` and `DateLessThan` conditions shown only define an absolute date-time range. Updated the description and statement ID to say "specific date range" instead.

## Review Notes
- JSON policy snippets were syntactically valid.
- AWS CLI was not installed in the local workspace, so command syntax was verified against the official AWS CLI command reference instead of local `--help` output.
- The policy size limits in the post match current AWS IAM quota documentation; AWS does not count whitespace against those IAM policy size limits.
