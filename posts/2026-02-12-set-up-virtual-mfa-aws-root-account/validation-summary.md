# Validation Summary: How to Set Up Virtual MFA for the AWS Root Account

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS account root user
- AWS IAM multi-factor authentication (MFA)
- Virtual authenticator apps / TOTP
- AWS CLI
- IAM credential reports
- AWS Organizations
- Boto3 for Python
- AWS Cost Anomaly Detection
- AWS Config managed rules

## Sources Consulted
- AWS IAM User Guide: Enable a virtual MFA device for the root user (console): https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-virt-mfa-for-root.html
- AWS IAM User Guide: Multi-factor authentication for AWS account root user: https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-mfa-for-root.html
- AWS IAM User Guide: Recover an MFA protected identity in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_lost-or-broken.html
- AWS IAM API Reference: GetAccountSummary: https://docs.aws.amazon.com/IAM/latest/APIReference/API_GetAccountSummary.html
- AWS IAM User Guide: Generate credential reports for your AWS account: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- AWS IAM User Guide: Use GetCredentialReport with an AWS SDK or CLI: https://docs.aws.amazon.com/IAM/latest/UserGuide/iam_example_iam_GetCredentialReport_section.html
- AWS CLI Command Reference: create-anomaly-monitor: https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-monitor.html
- AWS CLI Command Reference: create-anomaly-subscription: https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-subscription.html
- AWS Cost Management User Guide: Getting started with AWS Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html
- AWS Config Developer Guide: root-account-mfa-enabled managed rule: https://docs.aws.amazon.com/config/latest/developerguide/root-account-mfa-enabled.html
- Google Account Help: Get verification codes with Google Authenticator: https://support.google.com/accounts/answer/1066447

## Issues Found
- The post referred to AWS MFA "backup codes," but AWS virtual MFA setup provides a QR code and secret configuration key, not one-time backup codes. Updated the wording to refer to the recovery secret / saved secret key.
- The post stated that losing a phone means losing Google Authenticator codes. Google Authenticator now supports Google Account sync and manual transfer workflows, so the recommendation was updated to focus on using an authenticator app with backup, transfer, or a saved secret key.
- The root MFA recovery steps incorrectly described using the password reset flow. Replaced this with AWS's documented "Troubleshoot MFA" and "Sign in using alternative factors" flow using the root account email and primary contact phone number, with AWS Support as the fallback.
- The post recommended registering MFA on two devices through Authy. AWS now supports registering up to eight MFA devices for the root user, so the best practice was updated to use multiple AWS-registered MFA devices.
- The billing alert example described Cost Anomaly Detection as CloudWatch billing alerts and only created a monitor, which would not notify anyone by itself. Updated the example to create a Cost Anomaly Detection monitor and an email alert subscription.
- The Boto3 Organizations example used `list_accounts()` once, which only returns the first page of accounts. Updated it to use a paginator so it checks all organization accounts.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the current official AWS CLI command reference instead of local `--help` output. The AWS Config managed rule example is technically valid, but in a real account AWS Config must already be configured with the required recorder/delivery setup before the rule provides useful compliance evaluations.
