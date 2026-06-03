# Validation Summary: How to Create IAM Password Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM account password policies
- AWS CLI
- AWS CloudFormation custom resources
- AWS Lambda with Python and Boto3
- Terraform AWS provider
- AWS Config managed rules
- AWS IAM credential reports
- Amazon SES
- NIST SP 800-63B, PCI DSS, HIPAA, SOC 2, and CIS AWS Foundations Benchmark guidance

## Sources Consulted
- AWS IAM User Guide: Set an account password policy for IAM users - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html
- AWS CLI Command Reference: update-account-password-policy - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/update-account-password-policy.html
- AWS CLI Command Reference: get-account-password-policy - https://docs.aws.amazon.com/cli/latest/reference/iam/get-account-password-policy.html
- Boto3 IAM update_account_password_policy - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/update_account_password_policy.html
- Boto3 IAM generate_credential_report - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/generate_credential_report.html
- Boto3 IAM get_credential_report - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/get_credential_report.html
- AWS IAM User Guide: Generate credential reports - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- AWS CloudFormation cfn-response module - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html
- AWS Config managed rule iam-password-policy - https://docs.aws.amazon.com/config/latest/developerguide/iam-password-policy.html
- Terraform AWS provider aws_iam_account_password_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_account_password_policy
- Boto3 IAM list_user_tags - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam/client/list_user_tags.html
- Boto3 SES send_email - https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- NIST SP 800-63B Digital Identity Guidelines - https://pages.nist.gov/800-63-4/sp800-63b.html
- AWS Security Hub CIS AWS Foundations Benchmark mapping - https://docs.aws.amazon.com/securityhub/latest/userguide/cis-aws-foundations-benchmark.html
- HIPAA Security Rule, 45 CFR 164.308 - https://www.law.cornell.edu/cfr/text/45/164.308
- PCI DSS v4.0 Self-Assessment Questionnaire examples from PCI Security Standards Council - https://www.pcisecuritystandards.org/document_library

## Issues Found
- The post described the AWS default IAM password policy as having no character-type requirements and claimed `password1` would be accepted. AWS's current default requires a minimum of 8 characters, at least three of four character classes, and prevents passwords identical to the account name or email address. Updated the description and example.
- The NIST guidance was outdated. Current SP 800-63B requires 15 characters for single-factor passwords, allows 8 characters when passwords are used with MFA, prohibits periodic password changes, and prohibits composition rules. Updated the NIST references and the compliance table.
- The post overstated SOC 2, HIPAA, PCI DSS, and CIS rotation/complexity requirements. Updated the compliance discussion and table to reflect policy-defined, risk-based, conditional, or current CIS Benchmark guidance.
- The CloudFormation inline Lambda compared YAML booleans to the string `"true"`, which would cause true CloudFormation boolean values to be sent to IAM as false. Added a small boolean coercion helper.
- The CloudFormation custom resource response did not set a stable physical resource ID. Added `AccountPasswordPolicy` as the physical resource ID to avoid unnecessary replacements.
- The Python credential-report examples used a fixed 5-second sleep after `generate_credential_report()`. Boto3 documents `STARTED`, `INPROGRESS`, and `COMPLETE` states, and `get_credential_report()` can fail if the report is not ready. Replaced the fixed sleep with polling.
- The `hard-expiry` explanation omitted the documented CLI/API exception for users with `iam:ChangePassword` and active access keys. Added that nuance.

## Review Notes
- The AWS CLI, Terraform resource arguments, AWS Config managed rule identifier and input parameter names, Boto3 IAM method names, and SES `send_email` call shape were verified against official documentation.
- The CloudFormation example still intentionally leaves delete handling as a no-op; that can be acceptable for an account-level security setting, but teams may prefer explicit cleanup behavior in their own custom resource.
