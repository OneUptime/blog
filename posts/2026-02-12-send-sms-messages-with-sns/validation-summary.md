# Validation Summary: How to Send SMS Messages with SNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SNS
- Amazon SNS SMS
- AWS CLI
- Python
- Boto3
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon SNS Developer Guide: Sending SMS messages using Amazon SNS, https://docs.aws.amazon.com/sns/latest/dg/sms_sending-overview.html
- Amazon SNS API Reference: Publish, https://docs.aws.amazon.com/sns/latest/api/API_Publish.html
- Amazon SNS API Reference: SetSMSAttributes, https://docs.aws.amazon.com/sns/latest/api/API_SetSMSAttributes.html
- Amazon SNS Developer Guide: Using the Amazon SNS SMS sandbox, https://docs.aws.amazon.com/sns/latest/dg/sns-sms-sandbox.html
- Amazon SNS Developer Guide: Managing Amazon SNS phone numbers and subscriptions, https://docs.aws.amazon.com/sns/latest/dg/sms_manage.html
- Amazon SNS Developer Guide: Monitoring Amazon SNS topics using CloudWatch, https://docs.aws.amazon.com/sns/latest/dg/sns-monitoring-using-cloudwatch.html
- Amazon SNS Developer Guide: Best practices for Amazon SNS SMS messaging, https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html
- AWS CLI Command Reference: sns publish, https://docs.aws.amazon.com/cli/latest/reference/sns/publish.html
- AWS CLI Command Reference: sns set-sms-attributes, https://docs.aws.amazon.com/cli/latest/reference/sns/set-sms-attributes.html
- AWS General Reference: Amazon SNS endpoints and quotas, https://docs.aws.amazon.com/general/latest/gr/sns.html
- Boto3 SNS client documentation, https://docs.aws.amazon.com/boto3/latest/reference/services/sns.html

## Issues Found
- The first-send section implied that direct SMS publishing works without additional setup. AWS places new SNS SMS accounts in the SMS sandbox, where sends are limited to verified destination phone numbers, and some countries require an origination identity. Added a concise caveat before the first CLI command.
- The Python docstring described a single SMS as a maximum of 160 characters. AWS documents SMS parts as 160 GSM-7 characters or 70 UCS-2 characters, depending on encoding. Updated the wording.
- The account-level SMS preferences example labeled `DeliveryStatusSuccessSamplingRate` as an S3 bucket for delivery status logs. That attribute controls the percentage of successful SMS deliveries logged to CloudWatch Logs. Updated the comment.
- The CloudWatch monitoring example queried delivery metrics without dimensions. AWS SNS delivery metrics require dimensions such as `PhoneNumber` or `TopicName`, while `SMSMonthToDateSpentUSD` has no valid dimensions. Updated the example to accept a phone number, pass a `PhoneNumber` dimension for delivery metrics, and omit dimensions for spend.

## Review Notes
AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI command reference rather than local `aws --help` output.
