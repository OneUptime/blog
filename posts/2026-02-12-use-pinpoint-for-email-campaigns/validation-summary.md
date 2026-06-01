# Validation Summary: How to Use Pinpoint for Email Campaigns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Pinpoint
- Amazon SES
- AWS SDK for Python (boto3)
- Python
- Email templates
- Segments
- Campaigns
- Journeys
- Campaign analytics

## Sources Consulted
- Amazon Pinpoint end of support: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html
- Amazon Pinpoint template personalization: https://docs.aws.amazon.com/pinpoint/latest/userguide/message-templates-personalizing.html
- boto3 Pinpoint create_email_template: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/create_email_template.html
- boto3 Pinpoint create_segment: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/create_segment.html
- boto3 Pinpoint create_campaign: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/create_campaign.html
- boto3 Pinpoint get_application_date_range_kpi: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/get_application_date_range_kpi.html
- Amazon Pinpoint application metrics for campaigns: https://docs.aws.amazon.com/pinpoint/latest/developerguide/application-metrics-campaigns.html
- boto3 Pinpoint create_journey: https://docs.aws.amazon.com/boto3/latest/reference/services/pinpoint/client/create_journey.html
- Amazon Pinpoint campaign metrics: https://docs.aws.amazon.com/pinpoint/latest/developerguide/campaign-metrics.html

## Issues Found
- Added the current Amazon Pinpoint availability caveat: AWS stopped accepting new Pinpoint customers on May 20, 2025, and Pinpoint engagement features end support on October 30, 2026. The original post presented Pinpoint as the next step without that limitation.
- Fixed attribute-based segment code to use `UserAttributes` instead of endpoint `Attributes`, matching the post's `{{User.UserAttributes.X}}` template variables and Pinpoint's segment dimension schema.
- Corrected the activity-based segment explanation. Pinpoint `Behavior.Recency` is an activity/app recency segment criterion, not an email open/click engagement segment.
- Replaced campaign limit values and comments that described `0` as unlimited. The Pinpoint API defines `Daily` and `Total` as per-endpoint message caps, so the example now uses explicit caps and accurate comments.
- Replaced invalid application KPI names (`email-click-rate`, `email-bounce-rate`, and `email-complaint-rate`) with valid application campaign metrics.
- Fixed the journey example by moving `NextActivity` into the `EMAIL` and `Wait` activity objects, which is where the boto3 `create_journey` schema expects it.
- Updated the journey schedule `StartTime` to use a timezone-aware Python `datetime`, matching boto3's timestamp shape for journey schedules.

## Review Notes
The Python snippets were checked locally with `ast.parse` for syntax. Runtime execution was not attempted because the examples require live AWS credentials, a Pinpoint application, verified email identity, templates, and segments.
