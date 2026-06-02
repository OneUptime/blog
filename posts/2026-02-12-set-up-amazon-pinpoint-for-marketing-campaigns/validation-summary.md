# Validation Summary: How to Set Up Amazon Pinpoint for Marketing Campaigns

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Pinpoint
- AWS CLI
- Amazon SES
- AWS End User Messaging SMS and Voice v2
- Python
- Boto3
- Amazon S3

## Sources Consulted
- Amazon Pinpoint end of support: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html
- Amazon Pinpoint getting started guide: https://docs.aws.amazon.com/pinpoint/latest/userguide/gettingstarted.html
- Amazon Pinpoint email channel API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-channels-email.html
- Amazon Pinpoint email channel setup guide: https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-email-setup.html
- Amazon Pinpoint import jobs API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-jobs-import.html
- Amazon Pinpoint campaigns API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-campaigns.html
- Amazon Pinpoint campaign activities API reference: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-campaigns-campaign-id-activities.html
- Boto3 Pinpoint create_campaign reference: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/create_campaign.html

## Issues Found
- The post presented Amazon Pinpoint as the current place to start new marketing-campaign implementations. AWS documentation states that Pinpoint stopped accepting new customers on May 20, 2025 and will end support for Pinpoint engagement resources on October 30, 2026. Updated the introduction and summary to scope the tutorial to existing Pinpoint customers during the support window.
- The email channel setup omitted `OrchestrationSendingRoleArn`. AWS's email channel setup documentation says campaigns and journeys need an orchestration sending role for Pinpoint to send through SES on the customer's behalf. Added the field and explanatory text.
- The SMS setup referenced a generic phone number management API. Updated the wording to point to AWS End User Messaging SMS and Voice v2 for origination phone numbers and short codes.
- The "next Monday" scheduling example could schedule for the current day when run on a Monday, despite the comment saying next week. Updated it to compute a future Monday and use a timezone-aware UTC datetime with `isoformat()`.

## Review Notes
The remaining AWS CLI commands and Boto3 request shapes match the documented Pinpoint API structures. The AWS CLI was not installed locally, so command verification was performed against AWS's official CLI/API documentation rather than local `aws help` output.
