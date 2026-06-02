# Validation Summary: How to Send SES Emails with Boto3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SES
- Boto3
- Python
- MIME email messages
- Amazon SNS bounce and complaint notifications

## Sources Consulted
- Boto3 SES `send_email` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- Boto3 SES `send_raw_email` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_raw_email.html
- Boto3 SES `send_bulk_templated_email` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_bulk_templated_email.html
- Boto3 SES template guide: https://docs.aws.amazon.com/boto3/latest/guide/ses-template.html
- Boto3 SES email identity verification guide: https://docs.aws.amazon.com/boto3/latest/guide/ses-verify.html
- Amazon SES raw email and MIME guide: https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html
- Amazon SES notification documentation: https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html

## Issues Found
- The identity listing example labeled every result from `list_identities` as verified. Boto3 documents this operation as listing submitted identities in the current Region, so the example now labels them as identities rather than verified addresses.
- The attachment example attached text and HTML body parts directly under `multipart/mixed`. AWS's raw MIME guidance nests text and HTML alternatives inside a `multipart/alternative` part before attachments, so the example now follows that structure.
- The bulk templated email example provided partial `ReplacementTemplateData` while relying on `DefaultTemplateData` for missing keys. Boto3 documents default template data as a fallback when replacement data is not specified for a destination, so each replacement object now includes all template variables used by the template.
- The production sender description claimed rate limiting and bounce tracking that the class did not implement. The wording and local stats dictionary were narrowed to retries and send failure tracking.
- The best-practices section claimed SES templates are faster. I replaced that with the supported benefit that templates reduce duplicated layout code and improve consistency.

## Review Notes
All Python code blocks were parsed successfully with Python's AST parser. The examples use the SES API v1 Boto3 client (`ses`), which remains documented and valid, while SES API v2 also offers newer attachment and templated sending options.
