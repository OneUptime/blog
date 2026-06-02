# Validation Summary: How to Set Up Amazon SES for Sending Emails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Simple Email Service (Amazon SES)
- AWS CLI
- Amazon SES SMTP interface
- IAM access keys and SMTP credential derivation
- Python and boto3
- Node.js and AWS SDK for JavaScript v3
- Amazon SNS
- SES configuration sets
- SES account-level suppression list
- DKIM, SPF, and DMARC

## Sources Consulted
- Amazon SES pricing: https://aws.amazon.com/ses/pricing/
- AWS CLI Amazon SES examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_ses_code_examples.html
- Creating and verifying identities in Amazon SES: https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Obtaining Amazon SES SMTP credentials: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- Request production access / SES sandbox restrictions: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- AWS CLI `ses send-email` command reference: https://docs.aws.amazon.com/cli/latest/reference/ses/send-email.html
- AWS CLI `sesv2 create-configuration-set` command reference: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set.html
- AWS CLI `sesv2 create-configuration-set-event-destination` command reference: https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set-event-destination.html
- Amazon SES account-level suppression list: https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html
- Boto3 SES `send_email` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- AWS SDK for JavaScript v3 SES `SendEmailCommand` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/command/SendEmailCommand/

## Issues Found
- The pricing paragraph referenced the old 62,000 free emails per month for EC2-based sending. Updated it to the current AWS Free Tier wording of 3,000 message charges free each month for the first 12 months.
- The DKIM section said `verify-domain-dkim` returns three CNAME records. Updated it to say the command returns DKIM tokens used to create CNAME records, matching the AWS CLI output.
- The Python boto3 example used `ConfigurationSetName='my-config-set'`, but the tutorial creates a configuration set named `production-email`. Updated the example to use `production-email`.
- The configuration set event destination referenced an SNS topic before the tutorial created that topic. Moved the `aws sns create-topic` command before `create-configuration-set-event-destination`.
- The account-level suppression list command was presented while the tutorial was still in the sandbox flow. Added that it should be enabled after production access is approved, because SES sandbox restrictions disable suppression-list management API calls.

## Review Notes
The IAM policy example uses `AmazonSESFullAccess`, which works but is broader than necessary for SMTP sending. A future security-focused revision could replace it with a least-privilege policy allowing only the required send actions.
