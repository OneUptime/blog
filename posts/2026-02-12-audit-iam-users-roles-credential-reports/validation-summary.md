# Validation Summary: How to Audit IAM Users and Roles with Credential Reports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM credential reports
- AWS CLI
- Boto3 for Python
- AWS Lambda
- Amazon SNS
- IAM Access Advisor / service last accessed details

## Sources Consulted
- AWS IAM User Guide: Generate credential reports for your AWS account - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- AWS CLI Command Reference: generate-credential-report - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/generate-credential-report.html
- AWS CLI Command Reference: get-credential-report - https://docs.aws.amazon.com/cli/latest/reference/iam/get-credential-report.html
- Boto3 IAM client reference: get_credential_report - https://docs.aws.amazon.com/boto3/latest/reference/services/iam/client/get_credential_report.html
- AWS IAM User Guide: Refine permissions in AWS using last accessed information - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_last-accessed.html
- Boto3 SNS client reference: publish - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sns/client/publish.html
- OneUptime linked guide: deleting unused IAM users, roles, and policies - https://oneuptime.com/blog/post/2026-02-12-delete-unused-iam-users-roles-policies/view
- OneUptime linked guide: rotating IAM access keys safely - https://oneuptime.com/blog/post/2026-02-12-rotate-iam-access-keys-safely/view

## Issues Found
- The command presented as checking the last report timestamp used `generate-credential-report` and queried `Description`, which does not return a generation timestamp. Changed it to use `get-credential-report` and query `GeneratedTime` and `ReportFormat`.
- The post described credential reports as simply generated on demand. AWS documents that IAM reuses the most recent report if one was generated within the previous four hours. Updated the wording to reflect the four-hour reuse/generation window.
- The audit script compared credential report boolean fields only to lowercase string literals and checked only the first root access key. Updated the script to normalize boolean strings and detect either active root access key.
- The script reported `N/A` access-key last-used fields as "never been used." AWS documents that `N/A` can also mean the key was not used after IAM began tracking this data. Changed the finding text to "has no last-used data."
- The limitations section said the report does not show what keys were used for. AWS credential reports include last-used service and Region columns, but not specific API actions or resources. Updated that limitation for accuracy.
- The report comparison example also compared booleans only to lowercase strings. Updated it to normalize boolean strings before comparing MFA and access-key changes.

## Review Notes
The examples are syntactically valid Python. The Lambda snippet is intentionally partial because it depends on the earlier `run_credential_audit()` function being included in the deployment package. The SNS topic ARN remains a placeholder and must be replaced before use.
