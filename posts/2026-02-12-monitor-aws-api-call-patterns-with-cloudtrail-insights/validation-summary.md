# Validation Summary: How to Monitor AWS API Call Patterns with CloudTrail Insights

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudTrail Insights
- AWS CloudTrail trails
- Amazon EventBridge
- Amazon SNS
- AWS Lambda with Python and boto3
- CloudTrail Lake SQL
- AWS CLI

## Sources Consulted
- AWS CloudTrail: Working with CloudTrail Insights: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html
- AWS CloudTrail: Logging Insights events with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/insights-events-CLI-enable.html
- AWS CloudTrail: Managing trails with the AWS CLI: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-additional-cli-commands.html
- AWS CLI Command Reference: cloudtrail put-insight-selectors: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/put-insight-selectors.html
- AWS CloudTrail: Delivery of Insights events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/insights-events-understanding.html
- AWS CloudTrail: CloudTrail record contents for Insights events for trails: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-insights-fields-trails.html
- AWS CloudTrail: CloudTrail record contents for Insights events for event data stores: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-insights-fields-lake.html
- AWS CloudTrail: Supported SQL schemas for event data stores: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-supported-event-schemas.html
- Amazon EventBridge: AWS service events delivered via AWS CloudTrail: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html
- Amazon EventBridge: Using resource-based policies for Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CloudTrail: Create an event data store for Insights events with the console: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-event-data-store-insights.html

## Issues Found
- Corrected the description of API call rate and error rate Insights. AWS documents API call rate Insights for write management APIs, and current trail support can also include data events when enabled.
- Replaced references to source IP attribution with identities, user agents, and error codes. AWS's Insights attribution fields are `userIdentityArn`, `userAgent`, and `errorCode`.
- Removed the suggestion to use a "default trail." AWS provides Event history automatically, but Insights must be enabled on a trail or event data store.
- Clarified the 36-hour timing as delivery startup timing for trails when unusual activity is detected, rather than a guaranteed fixed baseline period.
- Added the Region caveat for `get-insight-selectors`, because AWS requires running it in the trail's home Region or specifying `--region`.
- Added an SNS topic policy command so EventBridge can publish to the SNS target when configured through the CLI.
- Fixed the EventBridge input transformer path for `insightType` and the start time. `insightType` is under `detail.insightDetails`, and the record time is `detail.eventTime`.
- Removed an invalid `//` comment from the JSON example and moved `insightType` into the documented `insightDetails` block.
- Updated the Lambda example to read `insightType` from `event['detail']['insightDetails']`.
- Fixed the CloudTrail Lake SQL query to use the Insights event data store schema fields: `insighteventname`, `insighteventsource`, and `insightContext.baselineaverage` / `insightContext.insightaverage`.
- Corrected the cost section to avoid saying Insights processes only management events. Data-event Insights are supported on trails, but not on CloudTrail Lake event data stores.

## Review Notes
- CloudTrail Lake is no longer open to new customers starting May 31, 2026, according to AWS documentation. The post's "if you have CloudTrail Lake set up" wording remains technically valid for existing customers.
- The local AWS CLI and Ruby were not installed in the workspace, so CLI options were verified against official AWS CLI documentation and JSON snippets were validated with Node.js.
