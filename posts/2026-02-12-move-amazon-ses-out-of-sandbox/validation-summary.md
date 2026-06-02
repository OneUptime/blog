# Validation Summary: How to Move Amazon SES Out of the Sandbox

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Simple Email Service (SES)
- AWS CLI v2
- SES v2 API
- Amazon SNS
- Amazon CloudWatch
- DKIM, SPF, and DMARC email authentication

## Sources Consulted
- AWS SES Developer Guide: Request production access (Moving out of the Amazon SES sandbox): https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- AWS SES Developer Guide: Managing your Amazon SES sending limits: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html
- AWS SES Developer Guide: Increasing your Amazon SES sending quotas: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-request-increase.html
- AWS SES Developer Guide: Monitoring your Amazon SES sender reputation: https://docs.aws.amazon.com/ses/latest/dg/monitor-sender-reputation.html
- AWS SES Developer Guide: Creating reputation monitoring alarms using CloudWatch: https://docs.aws.amazon.com/ses/latest/dg/reputationdashboard-cloudwatch-alarm.html
- AWS SES Developer Guide: Sending review process FAQs: https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html
- AWS CLI Command Reference: sesv2 put-account-details: https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-account-details.html
- AWS CLI Command Reference: sesv2 get-account: https://docs.aws.amazon.com/cli/latest/reference/sesv2/get-account.html
- AWS CLI Command Reference: sesv2 create-email-identity: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-email-identity.html
- AWS CLI Command Reference: sesv2 get-email-identity: https://docs.aws.amazon.com/cli/latest/reference/sesv2/get-email-identity.html
- AWS CLI Command Reference: sesv2 create-configuration-set: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set.html
- AWS CLI Command Reference: sesv2 create-configuration-set-event-destination: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set-event-destination.html
- AWS API Reference: SuppressionOptions: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SuppressionOptions.html

## Issues Found
- The post said every new AWS account starts with SES in sandbox mode. AWS documents SES sandbox status per AWS Region, so this was changed to say every new SES account starts in sandbox mode in each Region.
- The post said sandbox mode has "no bulk sending" and that users cannot send marketing emails or newsletters. AWS says SES features are available in sandbox, but sending is limited to verified identities and simulator addresses. This was changed to describe real-world bulk sending as impractical until production access.
- The post claimed production access starts at 50,000 emails per day and 14 emails per second. AWS documents production quotas as varying by use case. This was changed to say quotas and send rate are based on the approved use case.
- The post implied all listed prerequisites are checked requirements. AWS specifically calls domain verification a best practice and requires acknowledgement of opt-in plus bounce and complaint handling, but not every listed item is a hard prerequisite. The wording was softened.
- The `create-email-identity` comment implied the command completes domain verification. AWS CLI docs state it starts verification and returns DKIM tokens for DNS. The comment was updated to mention adding DKIM CNAME records.
- Some SES v2 setup commands omitted `--region` while the examples are region-specific. Region flags were added for consistency and to avoid accidental creation in the default region.
- The `get-account` reputation query referenced `ReputationOptions.ReputationMetricsEnabled`, which is not returned by `sesv2 get-account`. The query was changed to valid account-level fields: `EnforcementStatus` and `SendingEnabled`.
- The post said high bounce or complaint rates can put an account back in the sandbox. AWS documentation describes account review or sending pause. The wording was corrected.
- The automatic quota increase section implied guaranteed growth. AWS says SES might automatically increase quotas when qualifying conditions are met. The wording was changed from guaranteed to conditional.

## Review Notes
AWS CLI is not installed in the local environment, so command validation was performed against official AWS CLI v2 documentation instead of local `aws --help` output. The remaining CLI examples use current SES v2 command names and documented option names.
