# Validation Summary: How to Create IAM Policies with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS IAM (Identity and Access Management)
- AWS provider for Terraform/OpenTofu (hashicorp/aws)
- AWS S3, SQS, SNS (referenced as resource examples)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS provider Terraform Registry: `aws_iam_policy_document` data source documentation
- AWS provider documentation: `aws_iam_policy`, `aws_iam_role_policy`, `aws_iam_role_policy_attachment`, `aws_iam_role`, `aws_sqs_queue_policy` resources
- AWS IAM User Guide: Global condition context keys (`aws:RequestedRegion`, `aws:PrincipalTag/`, `aws:MultiFactorAuthPresent`, `aws:SourceArn`)
- AWS IAM User Guide: Condition operators (`StringEquals`, `BoolIfExists`, `ArnEquals`)
- AWS IAM User Guide: Permissions boundaries documentation
- AWS IAM User Guide: Resource-based policies (S3, SQS, SNS, KMS)

## Issues Found
No technical issues found.

All technical details verified correct:
- `aws_iam_policy_document` data source usage with `statement`, `condition`, and `principals` blocks is correct.
- The `.json` output attribute is correctly used to feed into `aws_iam_policy`, `aws_iam_role_policy`, and `aws_sqs_queue_policy`.
- The `permissions_boundary` argument on `aws_iam_role` is correctly spelled (plural).
- `BoolIfExists` with `aws:MultiFactorAuthPresent` is the recommended operator (avoids unintended deny effects on non-IAM-user principals).
- `ArnEquals` with `aws:SourceArn` is the standard pattern for confused-deputy prevention on SQS/SNS resource policies.
- Global condition keys (`aws:RequestedRegion`, `aws:PrincipalTag/Department`, `aws:MultiFactorAuthPresent`, `aws:SourceArn`) are all valid.
- IAM action names (`s3:ListBucket`, `s3:GetBucketLocation`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `sqs:SendMessage`, `ec2:*`, etc.) are valid.

## Review Notes
- The Permission Boundary example references `data.aws_iam_policy_document.ec2_trust.json` for `assume_role_policy`, but the trust policy data source is not defined within the snippet. This is a common didactic shortcut (assumed defined elsewhere); readers copy-pasting will need to define a trust policy. Not a technical error.
- The "Resource-Based Policies" line is rendered as plain text rather than a markdown heading (missing `##`). This is a formatting/style detail, not a technical error, and was left unchanged per scope.
- The phrase "type-safe" is a slight overstatement — `aws_iam_policy_document` provides structured HCL syntax but does not validate IAM action strings at plan time. Acceptable as marketing-style framing.
- The post is consistent with AWS provider v5+ best practices (uses separate `aws_iam_role_policy_attachment` resources rather than the deprecated `managed_policy_arns` attribute on `aws_iam_role`).
