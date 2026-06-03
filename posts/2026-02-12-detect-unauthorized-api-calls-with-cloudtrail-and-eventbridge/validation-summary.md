# Validation Summary: How to Detect Unauthorized API Calls with CloudTrail and EventBridge

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudTrail
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- AWS CLI
- Python
- IAM and EC2 security group audit events

## Sources Consulted
- AWS CloudTrail User Guide: CloudTrail integration with Amazon EventBridge - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-aws-service-specific-topics.html#cloudtrail-integration-eventbridge
- Amazon EventBridge User Guide: AWS service events delivered via AWS CloudTrail - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail.html
- Amazon EventBridge User Guide: Receiving read-only management events from AWS services - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-service-event-cloudtrail-management.html
- AWS CLI Command Reference: events put-rule - https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- Amazon EventBridge API Reference: InputTransformer - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_InputTransformer.html
- Amazon EventBridge User Guide: Using resource-based policies for Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS CloudTrail User Guide: AWS Management Console sign-in events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-aws-console-sign-in-events.html
- Amazon EventBridge User Guide: Event pattern syntax and comparison operators - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern.html and https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html
- Python standard library documentation: ipaddress - https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The post said CloudTrail was enough by default for EventBridge detection. AWS documentation says CloudTrail events are delivered to EventBridge when a trail is currently logging the relevant event types, so the prerequisite and explanation were corrected.
- The post implied every management event would match normal EventBridge rules. AWS documentation distinguishes write management events from read-only management events; read-only management events require `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`. Added that rule state where broad unauthorized API and root API detection need it.
- The SNS target examples omitted the required resource-based permission for EventBridge to publish to an SNS topic when configured through the CLI. Added an SNS topic policy example allowing `events.amazonaws.com` to call `sns:Publish`.
- The Lambda target example omitted the required Lambda resource-based permission for EventBridge invocation. Added an `aws lambda add-permission` command scoped to the rule ARN.
- The Access Denied event pattern missed the common `AccessDeniedException` error code. Added it to the match list.
- The Lambda section claimed geolocation enrichment, but the code only compared source IPs against known ranges. Updated the description to match the implementation.
- The Lambda CIDR check used string prefix matching, which is not a correct CIDR membership test. Replaced it with Python's standard `ipaddress` module.
- The JSON example for `anything-but` used a `//` comment, which made the snippet invalid JSON. Moved the comment outside the JSON block.
- The test command used an S3 bucket listing example that may rely on S3 data event logging rather than the management event rule being demonstrated. Replaced it with `aws iam list-users` and noted the read-only management event rule state requirement.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was checked against official AWS CLI and service documentation instead of local `aws --help` output.
- The SNS topic policy example is intentionally minimal for the tutorial; in production, merge the EventBridge publish statement into any existing topic policy rather than overwriting existing statements.
