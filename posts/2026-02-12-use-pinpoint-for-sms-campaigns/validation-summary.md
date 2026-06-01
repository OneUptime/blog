# Validation Summary: How to Use Pinpoint for SMS Campaigns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Pinpoint
- AWS End User Messaging SMS
- AWS CLI
- boto3 / AWS SDK for Python
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- Amazon SNS
- AWS Lambda
- 10DLC and SMS opt-out handling

## Sources Consulted
- Amazon Pinpoint end of support: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html
- Amazon Pinpoint SMS channel API: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-channels-sms.html
- AWS CLI `pinpoint update-sms-channel`: https://docs.aws.amazon.com/cli/latest/reference/pinpoint/update-sms-channel.html
- AWS CLI `pinpoint-sms-voice-v2 request-phone-number`: https://docs.aws.amazon.com/cli/latest/reference/pinpoint-sms-voice-v2/request-phone-number.html
- AWS End User Messaging SMS phone number request guide: https://docs.aws.amazon.com/sms-voice/latest/userguide/phone-numbers-request.html
- Amazon Pinpoint campaign API and schedule fields: https://docs.aws.amazon.com/pinpoint/latest/apireference/apps-application-id-campaigns-campaign-id-versions-version.html
- Amazon Pinpoint SMS event stream fields: https://docs.aws.amazon.com/pinpoint/latest/developerguide/event-streams-data-sms.html
- AWS End User Messaging SMS two-way SMS SNS payload: https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms-payload.html
- AWS CLI `pinpoint-sms-voice-v2 describe-spend-limits`: https://docs.aws.amazon.com/cli/latest/reference/pinpoint-sms-voice-v2/describe-spend-limits.html
- AWS CLI `pinpoint-sms-voice-v2 describe-account-attributes`: https://docs.aws.amazon.com/cli/latest/reference/pinpoint-sms-voice-v2/describe-account-attributes.html
- Amazon Pinpoint standard metrics for applications and campaigns: https://docs.aws.amazon.com/pinpoint/latest/developerguide/analytics-standard-metrics.html
- Amazon Pinpoint transactional SMS metrics: https://docs.aws.amazon.com/pinpoint/latest/developerguide/application-metrics-txn-sms.html
- Amazon Pinpoint application campaign metrics: https://docs.aws.amazon.com/pinpoint/latest/developerguide/application-metrics-campaigns.html

## Issues Found
- Added the current Amazon Pinpoint service-status caveat. AWS no longer accepts new Pinpoint customers as of May 20, 2025, and Pinpoint engagement features end support on October 30, 2026; SMS APIs continue as AWS End User Messaging SMS.
- Replaced the broad "over 200 countries" statement with "supported countries and regions" to avoid an unsupported hard count.
- Clarified that 10DLC applies to US long-code A2P messaging, while toll-free numbers and short codes use their own registration processes.
- Fixed the campaign schedule `Timezone` example from `America/New_York` to `UTC-05`, because Pinpoint campaign schedules accept UTC offset values rather than IANA timezone names.
- Corrected the opt-out explanation. AWS adds STOP replies to an opt-out list by default unless self-managed opt-outs are enabled; this is more precise than saying it is handled at the carrier level.
- Corrected the event-stream comment from Kinesis or CloudWatch to Kinesis Data Streams or Data Firehose.
- Corrected the `describe-account-attributes` comment. That command reports account attributes such as sandbox or production tier, not the current month's spending.
- Replaced invalid KPI name `sms-success-rate` with the documented application metric `successful-delivery-rate`.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against the official AWS CLI reference. The code snippets are illustrative and still require real AWS resource IDs, IAM permissions, provisioned origination identities, registrations, event streams, and application-specific functions such as `mark_sms_opted_out` and `get_user_status`.
