# Validation Summary: How to Monitor IoT Devices with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- Amazon CloudWatch metrics, dashboards, alarms, and Logs Insights
- CloudWatch agent
- AWS CLI
- AWS Lambda
- Python and Boto3

## Sources Consulted
- AWS IoT metrics and dimensions: https://docs.aws.amazon.com/iot/latest/developerguide/metrics_dimensions.html
- AWS IoT CloudWatch log entry format: https://docs.aws.amazon.com/iot/latest/developerguide/cwl-format.html
- Configure AWS IoT logging: https://docs.aws.amazon.com/iot/latest/developerguide/configure-logging.html
- AWS CLI set-v2-logging-options reference: https://docs.aws.amazon.com/cli/latest/reference/iot/set-v2-logging-options.html
- CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- AWS CLI put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- CloudWatch agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- CloudWatch agent custom dimensions scenarios: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-common-scenarios.html
- Boto3 CloudWatch put_metric_data reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- Boto3 AWS IoT describe_endpoint reference: https://docs.aws.amazon.com/boto3/latest/reference/services/iot/client/describe_endpoint.html
- Boto3 AWS IoT Data Plane get_thing_shadow reference: https://docs.aws.amazon.com/boto3/latest/reference/services/iot-data/client/get_thing_shadow.html

## Issues Found
- Replaced the non-existent AWS IoT metric `RuleMessageThrottled` with the documented metric `RuleExecutionThrottled` in the diagram, explanation, dashboard, and alarm example.
- Removed JavaScript-style comments from JSON code blocks so the dashboard and CloudWatch agent snippets are valid JSON files.
- Added documented dimensions to AWS IoT dashboard and alarm examples. Message broker metrics use the `Protocol` dimension, and rule metrics use the `RuleName` dimension.
- Corrected the CloudWatch agent gateway configuration by using documented measurement names and moving the custom `GatewayId` dimension into each metric collection section, where arbitrary custom dimensions are supported.
- Removed comment lines from CloudWatch Logs Insights query snippets so the queries can be pasted directly into Logs Insights.
- Reworked the offline-device Lambda example from a placeholder into runnable Python that discovers the AWS IoT data endpoint, reads each thing shadow, parses `state.reported.lastSeen`, compares it to the stale threshold, and publishes `OfflineDeviceCount`.
- Clarified that AWS IoT Core connection metrics cover connection attempts and throttling/authorization outcomes, not direct per-device disconnect tracking.

## Review Notes
The dashboard and rule-throttling alarm examples include `YourRuleName` as a placeholder that must be replaced with an actual IoT rule name. The offline-device approach depends on devices updating `state.reported.lastSeen` in their shadows; AWS IoT thing registry metadata does not automatically provide a last-seen timestamp.
