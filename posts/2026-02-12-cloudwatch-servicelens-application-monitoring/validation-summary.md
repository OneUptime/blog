# Validation Summary: How to Use CloudWatch ServiceLens for Application Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch ServiceLens / X-Ray Trace Map
- AWS X-Ray
- CloudWatch Logs
- CloudWatch Alarms
- AWS CLI
- IAM policies
- Node.js and Express
- Python and Flask
- ECS and EKS container workloads
- AWS Distro for OpenTelemetry (ADOT)

## Sources Consulted
- AWS X-Ray trace map documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html
- CloudWatch application map documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ServiceMap.html
- AWS X-Ray SDK and daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- AWS X-Ray SDK for Node.js Express middleware documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-middleware.html
- AWS X-Ray SDK for Node.js AWS SDK client instrumentation documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-awssdkclients.html
- AWS X-Ray annotations and metadata documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-segment.html
- AWS X-Ray SDK for Python Flask middleware documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-python-middleware.html
- CloudWatch trace-to-log correlation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Application-Signals-TraceLogCorrelation.html
- AWS X-Ray daemon on ECS documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-ecs.html
- AWS CLI put-metric-alarm documentation: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The IAM policy JSON included a JavaScript-style comment, which made it invalid JSON. Removed the comment and added `xray:GetTraceGraph`, which is used for trace graph retrieval.
- The post used older console navigation for "ServiceLens" and "Service Map." Updated it to the current CloudWatch "X-Ray traces" > "Trace Map" navigation and noted that the ServiceLens map is combined into the X-Ray trace map.
- The service map color legend was imprecise. Updated it to AWS's documented green, yellow, red, and purple meanings.
- The X-Ray SDK examples did not mention the February 25, 2026 maintenance-mode change. Added a short note that the SDKs and daemon still work, but AWS recommends OpenTelemetry or ADOT for new instrumentation.
- The log-correlation wording implied that ServiceLens links logs solely from an arbitrary `traceId` log field. Updated it to describe trace context more accurately and mention Application Signals/OpenTelemetry-supported automatic injection.
- The sample X-Ray trace ID was not in the documented X-Ray trace ID shape. Replaced it with a valid-looking `1-epoch-uniqueid` example.
- The ECS task definition was labeled YAML but written as JSON, and the bridge-mode sidecar example lacked the link needed for the `xray-daemon:2000` address. Changed the fence to JSON and added `networkMode` plus `links`.
- The CloudWatch alarm command used `--statistic "p99"`, which is not a valid AWS CLI statistic value. Changed it to `--extended-statistic "p99"` and made the namespace a custom service metric namespace instead of implying a generic `AWS/X-Ray` latency metric.

## Review Notes
The Node.js and Python X-Ray SDK examples are consistent with AWS documentation for existing SDK-based instrumentation, but new implementations should prefer OpenTelemetry or ADOT because the X-Ray SDKs and daemon are now in maintenance mode.
