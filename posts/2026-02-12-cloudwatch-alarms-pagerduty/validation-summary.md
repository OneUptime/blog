# Validation Summary: How to Integrate CloudWatch Alarms with PagerDuty

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Amazon CloudWatch Alarms
- Amazon SNS
- Amazon EventBridge API destinations
- AWS CLI
- AWS CloudFormation
- AWS Lambda
- Python
- PagerDuty CloudWatch integration
- PagerDuty Events API v2

## Sources Consulted
- PagerDuty Amazon CloudWatch Integration Guide: https://support.pagerduty.com/main/docs/amazon-cloudwatch-integration-guide
- PagerDuty Rulesets / Events API v2 routing key guidance: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration
- AWS CLI `cloudwatch put-metric-alarm` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI `cloudwatch set-alarm-state` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/set-alarm-state.html
- AWS CLI `events create-api-destination` reference: https://docs.aws.amazon.com/cli/latest/reference/events/create-api-destination.html
- AWS CLI `events put-targets` reference: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EventBridge API destinations documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html
- Amazon CloudWatch events in EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-cloudwatch.html
- Amazon API Gateway metrics and dimensions: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
- AWS CloudFormation `AWS::CloudWatch::Alarm` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-alarm.html

## Issues Found
- The PagerDuty CloudWatch integration URL examples used an outdated-looking `/integration/.../enqueue` URL. Updated the examples to PagerDuty's documented CloudWatch/Event Orchestration URL format, `https://events.pagerduty.com/x-ere/YOUR_INTEGRATION_KEY_HERE`.
- The sample API Gateway `5XXError` alarm described a 5% error-rate threshold but used `--threshold 5` with the `Average` statistic. API Gateway documents `Average` for `5XXError` as an error rate, so the threshold was changed to `0.05`.
- The existing-alarm update example omitted required `put-metric-alarm` fields. Added the original metric, threshold, comparison, period, evaluation, and dimension fields and clarified that `put-metric-alarm` overwrites the alarm configuration.
- The EventBridge example created an API destination but did not attach it to the rule or transform CloudWatch alarm events into PagerDuty Events API v2 payloads. Added a `put-targets` example with `InputTransformer`, `routing_key`, `event_action`, `dedup_key`, and payload fields.
- The EventBridge example used a PagerDuty REST API token in an Authorization header for the Events API v2 enqueue endpoint. Replaced that with body-based routing-key guidance because PagerDuty Events API v2 uses `routing_key` in the event JSON.
- The EventBridge section only showed ALARM-trigger handling. Added a note that OK auto-resolution requires a companion rule with the same `dedup_key` and `event_action: resolve`.
- The CloudFormation alarms for API Gateway metrics omitted metric dimensions. Added the `ApiName` dimension to match the CLI examples and API Gateway metric documentation.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation instead of local `aws --help` output. The Lambda example is syntactically valid Python and uses PagerDuty Events API v2 fields consistently, but production deployments should also store the routing key in a secret or environment variable rather than hard-coding it.
