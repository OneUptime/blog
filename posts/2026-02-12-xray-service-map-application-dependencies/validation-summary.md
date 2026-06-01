# Validation Summary: How to Use X-Ray Service Map for Application Dependencies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS X-Ray service map / trace map
- AWS X-Ray GetServiceGraph API
- AWS CLI for X-Ray
- Boto3 X-Ray client
- X-Ray groups and filter expressions
- Amazon CloudWatch ServiceLens / Application Signals
- OpenTelemetry trace collection

## Sources Consulted
- AWS X-Ray Developer Guide: Using the X-Ray trace map - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html
- AWS X-Ray Developer Guide: Getting data from AWS X-Ray - https://docs.aws.amazon.com/xray/latest/devguide/xray-api-gettingdata.html
- AWS CLI Command Reference: xray get-service-graph - https://docs.aws.amazon.com/cli/latest/reference/xray/get-service-graph.html
- AWS X-Ray Developer Guide: Using filter expressions - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html
- AWS X-Ray API Reference: CreateGroup - https://docs.aws.amazon.com/xray/latest/api/API_CreateGroup.html
- Boto3 documentation: XRay.Client.get_service_graph - https://docs.aws.amazon.com/boto3/latest/reference/services/xray/client/get_service_graph.html
- AWS X-Ray Developer Guide: AWS X-Ray daemon - https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- AWS X-Ray Developer Guide: X-Ray SDK and Daemon Support timeline - https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- Amazon CloudWatch User Guide: CloudWatch application map - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ServiceMap.html

## Issues Found
- Updated "real-time" wording to clarify that the map reflects trace data for the selected time range, matching AWS's trace map behavior.
- Replaced fixed health threshold claims with AWS's documented color meanings: green for successful calls, yellow for 400-series client errors, red for 500-series server faults, and purple for 429 throttling errors.
- Updated prerequisites to mention a supported trace emitter such as the X-Ray daemon or OpenTelemetry collector, because the X-Ray SDKs and daemon entered maintenance mode on February 25, 2026 and AWS recommends OpenTelemetry migration.
- Corrected the console access description to include the current CloudWatch X-Ray Trace Map location while preserving the X-Ray console path.
- Corrected the `get-service-graph --group-name` example description. The command retrieves a graph for an X-Ray group, not a graph centered on one service.
- Corrected the X-Ray annotation filter expression from `annotation.environment = "production"` to `annotation[environment] = "production"`, which matches X-Ray filter expression syntax.
- Generalized node shape wording because AWS documents service nodes, labels, and icons, but not the exact hexagonal/rectangular shape claims made in the original post.
- Updated the CloudWatch ServiceLens section to reflect AWS's current documentation that the X-Ray service map and CloudWatch ServiceLens map are combined into the CloudWatch X-Ray trace map, and that CloudWatch Application Map exists for Application Signals.

## Review Notes
- The Python snippets are syntactically valid and use the current Boto3 `get_service_graph` operation shape. For very large graphs, production scripts should use the Boto3 paginator or handle `NextToken`.
- The local environment did not have the AWS CLI or Boto3 installed, so command/API validation was performed against official AWS documentation rather than local `--help` output.
