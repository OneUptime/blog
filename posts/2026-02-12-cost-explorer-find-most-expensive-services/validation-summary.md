# Validation Summary: How to Use Cost Explorer to Find Your Most Expensive Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cost Explorer
- AWS Cost Explorer API via Boto3
- Amazon EC2
- Amazon CloudWatch
- AWS Organizations linked accounts
- Python

## Sources Consulted
- AWS Cost Explorer `GetCostAndUsage` API / Boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS Cost Explorer `GetCostAndUsageWithResources` API reference: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsageWithResources.html
- Amazon EC2 billing and usage report codes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-billing-usage-reports.html
- Amazon CloudWatch `get_metric_statistics` Boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Amazon EC2 `describe_instances` Boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instances.html
- AWS Cost Explorer pricing and hourly/resource-level granularity notes: https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/

## Issues Found
1. The first section said the script returned the top 10 services, but the code printed 15. Updated the prose to say top 15.
2. The service-level Cost Explorer query requested `UsageQuantity` while grouping by `SERVICE`. AWS documents that aggregated usage quantities across services are not meaningful because units differ, and the code did not use that value. Removed `UsageQuantity` from that query and the unused stored field.
3. Several Cost Explorer examples ignored `NextPageToken`, so large grouped result sets could be incomplete. Added pagination loops to all `get_cost_and_usage` snippets.
4. The EC2 section described an instance type breakdown, but the query grouped by `USAGE_TYPE`. Updated the surrounding prose and function docstring to match the actual query.
5. The EC2 usage table labeled usage as `Hours`, but Cost Explorer `UsageQuantity` units can vary by usage type. Changed the label to `Usage`.
6. The EC2 usage-type explanation listed `HeavyUsage`, `EBS`, and `DataTransfer` in a section filtered to `Amazon Elastic Compute Cloud - Compute`. Replaced those bullets with usage codes aligned with AWS EC2 billing documentation, including `HostUsage`, `EBSOptimized`, `Reservation`, and `UnusedBox`.
7. The idle-instance snippet called `describe_instances` without pagination. AWS recommends pagination for this API, so the snippet now uses an EC2 paginator.

## Review Notes
- The Python snippets were extracted from the Markdown and parsed successfully with Python 3.
- The AWS CLI is not installed in the review environment, but the post contains no terminal commands, so command validation was not required.
- The CloudWatch idle-instance example is technically valid, but CPU alone is not a complete idleness signal; network, disk, memory, and application metrics may be useful future additions.
- Cost Explorer resource-level data is available through `GetCostAndUsageWithResources` and related Cost Explorer settings, but the examples in this post focus on service, usage type, account, and trend analysis rather than per-resource Cost Explorer queries.
