# Validation Summary: How to Set Up CloudTrail Insights for Anomaly Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CloudTrail Insights
- AWS CLI
- Terraform AWS provider
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- Python boto3

## Sources Consulted
- AWS CloudTrail User Guide: Working with CloudTrail Insights - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html
- AWS CloudTrail User Guide: Logging Insights events with the AWS CLI - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/insights-events-CLI-enable.html
- AWS CloudTrail API Reference: PutInsightSelectors - https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_PutInsightSelectors.html
- AWS CloudTrail User Guide: CloudTrail record contents for Insights events for trails - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-insights-fields-trails.html
- AWS CloudTrail User Guide: Understanding CloudTrail events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-events.html
- AWS CloudTrail User Guide: Costs for Insights events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/insights-events-costs.html
- AWS CloudTrail pricing - https://aws.amazon.com/cloudtrail/pricing/
- Amazon EventBridge User Guide: AWS service events delivered via AWS CloudTrail - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html
- Amazon EventBridge Reference: AWS service event metadata - https://docs.aws.amazon.com/eventbridge/latest/ref/events-structure.html
- Terraform Registry: aws_cloudtrail resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail

## Issues Found
- The post described CloudTrail Insights as analyzing only management events. AWS now documents Insights for both management and data events, with data-event Insights supported on trails. Updated the scope and limitations accordingly.
- The post described API call rate Insights too broadly for management events. AWS documents management API call rate Insights as write-only management API calls. Clarified that distinction.
- The baseline section claimed a 36-hour initial warmup and a seven-day historical trend. AWS documentation now says CloudTrail analyzes the past 28 days of collected events for the initial baseline, recalculates daily from the past 28 days, and the event record reports baseline statistics for the preceding baseline period. Updated the wording.
- The EventBridge rule used `AWS CloudTrail Insight` as the `detail-type`. EventBridge documentation lists CloudTrail Insights events as `AWS Insight via CloudTrail`. Updated the event pattern.
- The SNS target setup omitted the topic-policy caveat. Added a note that restrictive SNS topic policies must allow the `events.amazonaws.com` service principal to publish.

## Review Notes
The AWS CLI and Terraform Insight selector examples are valid for enabling management-event Insights by default. Pricing was current as of this review: CloudTrail Insights for management events is $0.35 per 100,000 events analyzed per insight type, while data-event Insights has separate pricing.
