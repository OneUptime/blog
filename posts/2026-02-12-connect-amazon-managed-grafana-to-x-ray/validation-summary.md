# Validation Summary: How to Connect Amazon Managed Grafana to X-Ray

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Grafana
- AWS X-Ray
- Grafana AWS X-Ray / AWS Application Signals data source
- AWS IAM
- AWS CLI
- OpenTelemetry
- Amazon CloudWatch

## Sources Consulted
- Amazon Managed Grafana User Guide: Connect to an AWS X-Ray data source: https://docs.aws.amazon.com/grafana/latest/userguide/x-ray-data-source.html
- Amazon Managed Grafana User Guide: Using the X-Ray data source: https://docs.aws.amazon.com/grafana/latest/userguide/xray-using.html
- Grafana documentation: Configure the AWS Application Signals data source: https://grafana.com/docs/plugins/grafana-x-ray-datasource/latest/configure/
- Grafana documentation: AWS Application Signals query editor: https://grafana.com/docs/plugins/grafana-x-ray-datasource/latest/query-editor/
- AWS X-Ray Developer Guide: Using filter expressions: https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html
- AWS CLI Command Reference: xray create-sampling-rule: https://docs.aws.amazon.com/cli/latest/reference/xray/create-sampling-rule.html
- AWS X-Ray Developer Guide: X-Ray SDK and daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html

## Issues Found
- Added `ec2:DescribeRegions` to the IAM policy because the Amazon Managed Grafana X-Ray data source documentation includes it in the minimal permissions needed for X-Ray data source region support.
- Updated the prerequisite instrumentation note to prefer OpenTelemetry and mention the X-Ray SDK/daemon maintenance-mode timeline that began on February 25, 2026.
- Corrected the Trace Statistics panel description. X-Ray Trace Statistics returns average response time and success/error/fault/throttle/total counts, not p50, p90, or p99 latency percentiles.
- Corrected the Service Map color explanation. Grafana's X-Ray service map uses red for faults, yellow for errors, purple for throttled responses, and green for success.
- Changed the annotation filter expression from dot notation to the AWS X-Ray documented bracket notation, `annotation[customer_tier]`.
- Fixed the combined-services filter expression so the `error = true` predicate applies to both services.
- Corrected the alerting section to match the Grafana and Amazon Managed Grafana documentation: Trace Statistics queries return numeric data, so Grafana alerts are supported on those query results.

## Review Notes
The post is technically relevant and current after the fixes. Future revisions could expand the cross-account section to distinguish per-data-source AssumeRole setup from newer cross-account observability controls exposed by the AWS Application Signals data source.
