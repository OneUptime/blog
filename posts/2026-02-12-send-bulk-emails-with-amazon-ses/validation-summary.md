# Validation Summary: How to Send Bulk Emails with Amazon SES

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Simple Email Service (SES)
- AWS CLI
- Boto3 for Python
- SES email templates
- SES configuration sets and event destinations
- Amazon CloudWatch
- DNS domain verification and DKIM

## Sources Consulted
- AWS CLI Command Reference: `verify-domain-dkim` - https://docs.aws.amazon.com/cli/latest/reference/ses/verify-domain-dkim.html
- Amazon SES Developer Guide: Creating and verifying identities - https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Amazon SES Developer Guide: Request production access / sandbox limits - https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Amazon SES API Reference: `SendBulkTemplatedEmail` - https://docs.aws.amazon.com/ses/latest/APIReference/API_SendBulkTemplatedEmail.html
- AWS CLI Command Reference: `send-bulk-templated-email` - https://docs.aws.amazon.com/cli/latest/reference/ses/send-bulk-templated-email.html
- AWS CLI Command Reference: `create-configuration-set-event-destination` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/create-configuration-set-event-destination.html
- Amazon SES Developer Guide: Increasing sending quotas - https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-request-increase.html
- Amazon SES Developer Guide: Sending review process FAQs - https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html
- Amazon SES pricing - https://aws.amazon.com/ses/pricing/

## Issues Found
- The domain setup CLI example only ran `verify-domain-identity`, but the post said SES would also provide DKIM CNAME records. Added `aws ses verify-domain-dkim --domain yourdomain.com` and clarified that the identity verification command returns the TXT record while the DKIM command returns Easy DKIM CNAME records.
- The `DefaultTemplateData` explanation implied defaults are used for any missing replacement variable in a recipient's replacement data. AWS documents it as fallback data when replacement template data is not specified for a destination, so the wording was corrected.
- The pricing section referenced the old EC2-related 62,000-message free allowance. AWS's current SES pricing page describes a 3,000-message free tier for the first 12 months and separate data transfer, attachment, and add-on charges, so the cost section was updated.

## Review Notes
The remaining AWS CLI and Boto3 examples use current SES APIs and valid parameter names. The post uses SES v1 APIs for templates and `SendBulkTemplatedEmail` while using SES v2 for configuration set event destination setup; this is valid for the shown fields, but future updates could consider using SES v2 sending APIs consistently.
