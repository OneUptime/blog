# Validation Summary: How to Enable and Enforce MFA for IAM Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- AWS multi-factor authentication (MFA)
- AWS CLI
- AWS Security Token Service (STS)
- AWS Config managed rules
- AWS CloudTrail and Amazon EventBridge
- Python and Boto3
- IAM policies

## Sources Consulted
- AWS IAM User Guide: AWS Multi-factor authentication in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html
- AWS IAM User Guide: Assign MFA devices in the AWS CLI or AWS API: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_cliapi.html
- AWS IAM User Guide: Allows IAM users to self-manage an MFA device: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_iam_mfa-selfmanage.html
- AWS IAM User Guide: AWS global condition context keys, including aws:MultiFactorAuthPresent: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS CLI Command Reference: create-virtual-mfa-device: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/iam/create-virtual-mfa-device.html
- AWS CLI Command Reference: get-session-token: https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html
- AWS IAM User Guide: Generate credential reports for your AWS account: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html
- Boto3 documentation: IAM ListUsers paginator: https://docs.aws.amazon.com/boto3/latest/reference/services/iam/paginator/ListUsers.html
- AWS Config Developer Guide: iam-user-mfa-enabled managed rule: https://docs.aws.amazon.com/config/latest/developerguide/iam-user-mfa-enabled.html
- AWS CloudTrail User Guide: AWS Management Console sign-in events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-aws-console-sign-in-events.html

## Issues Found
- The CLI example created a virtual MFA device named `user-jane-mfa`, but the self-management IAM policy allowed users to create MFA device resources named `${aws:username}`. Changed the example device name and serial number to `jane` / `arn:aws:iam::123456789012:mfa/jane` so the CLI example matches the policy and STS example.
- The MFA type list used older wording for FIDO devices. Updated it to AWS's current terminology: passkeys and security keys, and adjusted the root account recommendation to prefer phishing-resistant MFA.
- The Boto3 script used `iam.list_users()["Users"]`, which only returns one response page. Updated it to use the official IAM `list_users` paginator so the script actually checks all IAM users.
- The shell helper printed that the session expires in one hour but did not pass `--duration-seconds 3600`. Added the duration option to make the command match the message.
- The monitoring section referred to a "CloudWatch Events rule." Updated this to Amazon EventBridge and specified CloudTrail `ConsoleLogin` events with `additionalEventData.MFAUsed` set to `No`, matching current AWS event terminology and CloudTrail event fields.

## Review Notes
The AWS Config rule shown, `IAM_USER_MFA_ENABLED`, is valid and checks MFA across IAM users. For teams that only want to evaluate IAM users with console passwords, AWS also provides `MFA_ENABLED_FOR_IAM_CONSOLE_ACCESS`.
