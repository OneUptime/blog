# Validation Summary: How to Set Up AWS Audit Manager for Compliance Auditing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Audit Manager
- AWS CLI
- Amazon S3
- AWS Config
- AWS CloudTrail
- AWS Security Hub CSPM
- Amazon EventBridge
- Amazon SNS
- AWS Lambda

## Sources Consulted
- AWS Audit Manager availability change: https://docs.aws.amazon.com/audit-manager/latest/userguide/audit-manager-availability-change.html
- AWS CLI Command Reference for `auditmanager register-account`: https://docs.aws.amazon.com/cli/latest/reference/auditmanager/register-account.html
- AWS CLI Command Reference for `auditmanager create-assessment`: https://docs.aws.amazon.com/cli/latest/reference/auditmanager/create-assessment.html
- AWS CLI Command Reference for `auditmanager create-control`: https://docs.aws.amazon.com/cli/latest/reference/auditmanager/create-control.html
- AWS CLI Command Reference for `auditmanager create-assessment-framework`: https://docs.aws.amazon.com/cli/latest/reference/auditmanager/create-assessment-framework.html
- AWS CLI Command Reference for `auditmanager batch-create-delegation-by-assessment`: https://docs.aws.amazon.com/cli/latest/reference/auditmanager/batch-create-delegation-by-assessment.html
- AWS Audit Manager supported data source types: https://docs.aws.amazon.com/audit-manager/latest/userguide/control-data-sources.html
- AWS Audit Manager evidence collection behavior: https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html
- AWS Audit Manager assessment reports: https://docs.aws.amazon.com/audit-manager/latest/userguide/assessment-reports.html
- AWS Audit Manager EventBridge monitoring: https://docs.aws.amazon.com/audit-manager/latest/userguide/automating-with-eventbridge.html
- Amazon EventBridge AWS Audit Manager events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-auditmanager.html
- AWS Config managed rule `iam-user-mfa-enabled`: https://docs.aws.amazon.com/config/latest/developerguide/iam-user-mfa-enabled.html
- AWS Audit Manager pricing: https://aws.amazon.com/audit-manager/pricing/

## Issues Found
- The post did not mention that AWS Audit Manager is no longer open to new customers as of April 30, 2026. Added a note that the setup instructions apply to existing customers in accounts and Regions where Audit Manager was already set up.
- The `register-account` description incorrectly said the command specified an S3 evidence destination. Updated it to describe enabling Audit Manager and optional delegated administrator use; the S3 bucket is for assessment reports.
- The evidence section incorrectly described four evidence types and omitted AWS API calls as an automated data source. Updated the section to describe automated and manual evidence, with automated evidence sourced from AWS Config, CloudTrail, Security Hub CSPM, and AWS API calls.
- The evidence collection section said automated evidence runs continuously. Updated it to reflect source-specific collection frequencies documented by AWS.
- The custom control example used the AWS Config managed rule name as `keywordValue`. Updated it to the required managed rule identifier `IAM_USER_MFA_ENABLED`.
- The delegation and report examples used an invalid assessment ID placeholder. Replaced it with a UUID-shaped placeholder matching the CLI constraints.
- The assessment report section said the report lands in S3 as a PDF. Updated it to explain that Audit Manager produces a zip folder containing the summary PDF and related evidence files.
- The EventBridge event pattern used an unsupported detail type and CloudTrail-style event name for a service event. Updated the example to use the documented `Assessment Control Reviewed` detail type.
- The pricing section used an outdated free tier of 10,000 resource assessments per month. Updated it to the current AWS pricing page details: 35,000 resource assessments per month for two calendar months for first-time customers, with usage priced at $1.25 per 1,000 resource assessments.

## Review Notes
AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference and AWS service documentation. The guide remains relevant for existing AWS Audit Manager customers, but future posts should make the maintenance-mode limitation prominent because new AWS customers can no longer set up the service after April 30, 2026.
