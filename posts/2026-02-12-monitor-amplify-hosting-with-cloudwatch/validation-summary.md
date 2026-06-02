# Validation Summary: How to Monitor Amplify Hosting with CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Hosting
- Amazon CloudWatch metrics, dashboards, alarms, and Logs Insights
- Amazon CloudWatch Logs metric filters
- Amazon SNS
- AWS Lambda
- Slack incoming webhooks
- AWS CLI

## Sources Consulted
- AWS Amplify Hosting documentation: Monitoring an Amplify application with Amazon CloudWatch, https://docs.aws.amazon.com/amplify/latest/userguide/monitoring-with-cloudwatch.html
- AWS Amplify Hosting documentation: Monitoring an Amplify application, https://docs.aws.amazon.com/amplify/latest/userguide/access-logs.html
- Amazon CloudWatch Logs documentation: CloudWatch Logs Insights language query syntax, https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm, https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: cloudwatch list-metrics, https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/list-metrics.html
- AWS CLI Command Reference: cloudwatch put-dashboard, https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-dashboard.html
- AWS CLI Command Reference: logs put-metric-filter, https://docs.aws.amazon.com/cli/latest/reference/logs/put-metric-filter.html
- Amazon CloudWatch API Reference: Dashboard Body Structure and Syntax, https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html

## Issues Found
- The post claimed Amplify Hosting publishes build duration and build failure metrics to CloudWatch. AWS documents seven `AWS/AmplifyHosting` metrics, and build duration/build failure metrics are not among them. I removed those unsupported metrics and replaced the build-related examples with `TokensConsumed`, which is a documented Amplify Hosting metric.
- The post described SSR metrics as Lambda function duration and Lambda cold starts. AWS documents `Latency` as time to first byte in seconds, not Lambda duration, and does not document a cold-start Amplify Hosting metric. I changed that language to latency and SSR runtime logs.
- The high-latency alarm used a threshold of `3000` while describing a 3-second threshold. Because the Amplify Hosting `Latency` metric is measured in seconds, I changed the threshold to `3`.
- The Logs Insights examples used SQL-style `--` comments. CloudWatch Logs Insights uses `#` for comments, so I updated the query comments.
- The SSR log section assumed Lambda REPORT fields such as `@duration` and `@initDuration` and a branch-specific log group path. I changed the examples to generic SSR runtime log queries and directed readers to confirm the exact log group in the Amplify console.
- Example SNS ARNs used a 9-digit account ID. I changed them to a 12-digit example account ID, matching AWS account ID format.
- The X-Ray recommendation referred specifically to SSR functions. I changed it to server-side code and API calls to avoid implying that Amplify exposes SSR as user-managed Lambda functions in all hosting modes.

## Review Notes
The AWS CLI commands and CloudWatch dashboard JSON structure are syntactically aligned with the AWS CLI and CloudWatch documentation after the corrections. The example thresholds for token consumption are placeholders and should be tuned to an application's baseline traffic and quota.
