# Validation Summary: How to Use SES for Receiving Emails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SES email receiving
- SES receipt rules and receipt filters
- Amazon S3
- AWS Lambda
- Amazon SNS
- Amazon WorkMail
- AWS CLI
- Python email parsing
- Boto3
- DNS MX records

## Sources Consulted
- Amazon SES regions and endpoints: https://docs.aws.amazon.com/general/latest/gr/ses.html
- Amazon SES regions guide: https://docs.aws.amazon.com/ses/latest/dg/regions.html
- Amazon SES email receiving concepts and receipt rule processing: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-concepts.html
- AWS CLI `create-receipt-rule` reference: https://docs.aws.amazon.com/cli/latest/reference/ses/create-receipt-rule.html
- AWS CLI `create-receipt-filter` reference: https://docs.aws.amazon.com/cli/latest/reference/ses/create-receipt-filter.html
- Amazon SES S3 action documentation: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-s3.html
- Amazon SES Lambda action documentation: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda.html
- Amazon SES incoming Lambda event documentation: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-lambda-event.html
- Amazon SES notification contents documentation: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-notifications-contents.html
- Amazon SES permissions for email receiving: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-permissions.html
- Amazon SES service quotas: https://docs.aws.amazon.com/ses/latest/dg/quotas.html
- AWS Lambda `AddPermission` API reference: https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- Python email parser documentation: https://docs.python.org/3/library/email.parser.html
- Linked OneUptime SES/Boto3 article: https://oneuptime.com/blog/post/2026-02-12-integrate-ses-with-python-boto3-applications/view
- Linked OneUptime SES/Lambda article: https://oneuptime.com/blog/post/2026-02-12-use-ses-with-lambda-for-email-processing/view

## Issues Found
- The post listed only US East (N. Virginia), US West (Oregon), and Europe (Ireland) as SES email receiving regions. AWS now documents many more email receiving endpoints, so the text was changed to tell readers to check the current AWS Email Receiving endpoints table.
- The actions list incorrectly combined stopping processing with rejecting an email. SES Stop actions stop rule evaluation, while Bounce actions reject email with a bounce response. The list was split into separate stop and reject bullets.
- The S3 bucket policy example only constrained access with `AWS:SourceAccount`. AWS's SES receiving permissions example also uses `AWS:SourceArn` for the receipt rule, so the policy was updated to include the receipt rule ARN.
- The post said leaving `Recipients` empty matches all incoming email for the domain. AWS documents this behavior for an omitted recipient condition, so the wording was changed to "omit `Recipients`" and "verified domains."
- The Lambda sample decoded the raw S3 email object as UTF-8 and then parsed it with `email.message_from_string`. Raw MIME messages are byte streams and can contain non-UTF-8 encoded parts, so the code now reads bytes and parses them with `email.message_from_bytes`.
- The Lambda sample accessed `mail['commonHeaders']['subject']` directly, but SES documents common header fields as varying based on the incoming message. The sample now falls back to `(no subject)`.
- The Lambda permission example omitted `--source-arn`. AWS recommends scoping service-principal Lambda permissions with the source resource, so the command now includes the SES receipt rule ARN.
- The post said receipt rule processing stops at the first match. AWS documents that all receipt rules in the active rule set are applied in order, with actions executed in order; stopping requires a Stop action or stop disposition from a synchronous Lambda action. The explanation was corrected.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against official AWS CLI documentation rather than local `aws --help` output. The post still uses the SES v1 receipt rule APIs, which remain documented for SES email receiving.
