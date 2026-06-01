# Validation Summary: How to Use X-Ray Insights for Automated Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS X-Ray
- X-Ray Insights
- AWS CLI
- Amazon EventBridge
- Amazon SNS
- AWS Lambda
- Python boto3
- Distributed tracing and anomaly detection

## Sources Consulted
- AWS X-Ray Developer Guide: Using X-Ray insights - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-insights.html
- AWS X-Ray API Reference: GetInsightSummaries - https://docs.aws.amazon.com/xray/latest/api/API_GetInsightSummaries.html
- AWS X-Ray API Reference: Insight - https://docs.aws.amazon.com/xray/latest/api/API_Insight.html
- AWS X-Ray API Reference: GetInsightEvents - https://docs.aws.amazon.com/xray/latest/api/API_GetInsightEvents.html
- AWS CLI Command Reference: xray create-group - https://docs.aws.amazon.com/cli/latest/reference/xray/create-group.html
- AWS CLI Command Reference: xray update-group - https://docs.aws.amazon.com/cli/latest/reference/xray/update-group.html
- AWS CLI Command Reference: xray get-insight - https://docs.aws.amazon.com/cli/latest/reference/xray/get-insight.html
- AWS CLI Command Reference: xray get-insight-summaries - https://docs.aws.amazon.com/cli/latest/reference/xray/get-insight-summaries.html
- AWS CLI Command Reference: xray get-insight-events - https://docs.aws.amazon.com/cli/latest/reference/xray/get-insight-events.html
- Amazon EventBridge Events Reference: AWS X-Ray events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-xray.html
- Amazon EventBridge User Guide: Event bus targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Amazon EventBridge User Guide: Resource-based policies for SNS targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS Cloud Operations Blog: Discover application issues and get notifications with AWS X-Ray Insights - https://aws.amazon.com/blogs/mt/discover-application-issues-get-notifications-aws-x-ray-insights/

## Issues Found
- The EventBridge rule used `X-Ray Insight State Change` as the `detail-type`, but AWS documents the X-Ray Insights event name as `AWS X-Ray Insight Update`. Updated the rule and sample event.
- The sample event was marked as JSON but included a JavaScript-style comment and omitted standard EventBridge envelope fields. Removed the comment and adjusted the sample to valid JSON with the documented EventBridge detail type.
- The sample event and Lambda code assumed undocumented `TopAnomalousServices[].FaultStatistics.ErrorPercent` data. Updated the Lambda example to call `get_insight`, use the returned `Insight` object, and compute a root-cause fault rate from documented `RootCauseServiceRequestImpactStatistics` fields.
- The EventBridge-to-SNS setup omitted the SNS resource policy requirement for CLI-created targets. Added a note that the topic policy must allow `events.amazonaws.com` to publish, or that the EventBridge console can add this permission.

## Review Notes
- AWS X-Ray Insights documentation describes anomaly detection primarily around fault rates and impact analysis. The post's broader latency/anomaly wording is acceptable as high-level observability framing, but future updates could make fault-rate detection more explicit.
- AWS X-Ray SDKs and the X-Ray daemon entered maintenance mode on February 25, 2026 and are scheduled for end of support on February 25, 2027. Future tracing setup posts should prefer OpenTelemetry or AWS Distro for OpenTelemetry where practical.
