# Validation Summary: How to Set Up AWS Personal Health Dashboard Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Health Dashboard
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- AWS CLI
- AWS CloudFormation
- Slack incoming webhooks
- PagerDuty Events API v2
- Python

## Sources Consulted
- AWS Health User Guide: Monitoring events in AWS Health with Amazon EventBridge: https://docs.aws.amazon.com/health/latest/ug/cloudwatch-events-health.html
- AWS Health User Guide: Creating EventBridge rules for AWS Region coverage: https://docs.aws.amazon.com/health/latest/ug/choosing-a-region.html
- AWS Health User Guide: Reference: AWS Health events Amazon EventBridge schema: https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- AWS Health User Guide: Configuring an EventBridge rule to send notifications about events in AWS Health: https://docs.aws.amazon.com/health/latest/ug/creating-event-bridge-events-rule-for-aws-health.html
- Amazon EventBridge Events Reference: AWS Health events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-health.html
- Amazon EventBridge Events Reference: AWS service event metadata: https://docs.aws.amazon.com/eventbridge/latest/ref/events-structure.html
- AWS CloudFormation Template Reference: AWS::Events::Rule: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS CloudFormation Template Reference: AWS::SNS::TopicPolicy: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sns-topicpolicy.html
- Amazon EventBridge API Reference: PutEvents: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html
- Slack Developer Docs: Sending messages using incoming webhooks: https://api.slack.com/messaging/webhooks
- PagerDuty Support Docs: Rulesets advanced configuration / Events API v2 endpoint usage: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration

## Issues Found
- The basic SNS setup added the SNS topic as an EventBridge target but did not grant EventBridge permission to publish to the topic. Added an `aws sns set-topic-attributes` policy command allowing the `events.amazonaws.com` service principal to call `sns:Publish`.
- The post implied a single `us-east-1` EventBridge rule receives every AWS Health event. AWS Health regional coverage is more nuanced: rules receive events delivered to their Region, `us-west-2` can be used for simplified all-standard-Region coverage, and `us-east-1` is required for global events. Updated the wording accordingly.
- The Lambda, Slack, and PagerDuty examples used the top-level EventBridge `region` as the impacted Region. AWS Health documents the impacted Region in `detail.eventRegion`; the top-level `region` is the delivery Region. Updated the examples to use `detail.eventRegion`.
- The service filter used `ELB`, but AWS Health event examples use `ELASTICLOADBALANCING` for Elastic Load Balancing service events. Updated the filter value.
- The testing section tried to publish a customer-generated EventBridge event with source `aws.health`. EventBridge reserves `aws.` sources for AWS service events. Updated the test to use a temporary rule with a custom source and send the test event through that rule.

## Review Notes
- The post still uses the older "Personal Health Dashboard" name in several places. AWS documentation now generally refers to "AWS Health Dashboard," but the older term remains recognizable and the content is technically salvageable.
- The Lambda-target deployment guidance is high level; a production deployment still needs the usual Lambda invoke permission for EventBridge and secure storage for webhook/routing keys.
