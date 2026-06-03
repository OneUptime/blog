# Validation Summary: How to Configure SES Suppression Lists

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SES / SES API v2
- AWS CLI `sesv2`
- Boto3 for SESv2, DynamoDB, and CloudWatch
- Amazon DynamoDB
- Amazon CloudWatch custom metrics

## Sources Consulted
- Amazon SES Developer Guide: Using the Amazon SES account-level suppression list - https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html
- Amazon SES Developer Guide: Using configuration set-level suppression to override your account-level suppression list - https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list-config-level.html
- AWS CLI Command Reference: `sesv2 put-account-suppression-attributes` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-account-suppression-attributes.html
- AWS CLI Command Reference: `sesv2 put-configuration-set-suppression-options` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-configuration-set-suppression-options.html
- AWS CLI Command Reference: `sesv2 list-suppressed-destinations` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/list-suppressed-destinations.html
- AWS CLI Command Reference: `sesv2 put-suppressed-destination` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/put-suppressed-destination.html
- AWS CLI Command Reference: `sesv2 delete-suppressed-destination` - https://docs.aws.amazon.com/cli/latest/reference/sesv2/delete-suppressed-destination.html
- Boto3 SESv2 `put_suppressed_destination` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sesv2/client/put_suppressed_destination.html
- Boto3 SESv2 `list_suppressed_destinations` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sesv2/client/list_suppressed_destinations.html
- Boto3 SESv2 `send_email` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/sesv2/client/send_email.html
- Boto3 CloudWatch `put_metric_data` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html

## Issues Found
- The post said the account-level suppression list applies to all emails from the SES account. AWS documents account-level suppression lists as applying to the AWS account in the current AWS Region, so the wording was updated to include the regional scope.
- The post implied SES simply drops suppressed mail before delivery. AWS documents that SES accepts the message but does not send it when the address suppression reason matches the configured suppression settings, so the wording was updated.
- The configuration-set section implied a configuration set has its own separate suppression list. AWS documents configuration-set-level suppression as an override mechanism that changes which reasons add addresses to the account-level suppression list, so the explanation was corrected.
- The "Bulk Import" section described a per-address `put_suppressed_destination` loop as bulk import. AWS documents true bulk import through `CreateImportJob` with an S3-hosted CSV or newline-delimited JSON file, so the wording was changed to describe the script as suitable for smaller imports and point large lists to the SES bulk import flow.
- The application-level send example used SES v1 `send_email` parameters (`Source` and `Message`) while the rest of the post uses SESv2. The example was updated to SESv2 parameters (`FromEmailAddress` and `Content.Simple`) so it works with a `boto3.client('sesv2')` client.
- The post said an application suppression layer saves API calls. AWS documents that messages to account-level suppressed addresses still count toward the daily sending quota, so the wording was updated to say it saves API calls and daily sending quota usage.

## Review Notes
The AWS CLI commands and suppression-management Boto3 calls were otherwise current and aligned with official AWS documentation. The linked OneUptime companion posts returned HTTP 200 during validation.
