# Validation Summary: How to Use Aurora I/O-Optimized for Predictable Pricing

## Status
validated

## Post Type
Tutorial / cost optimization guide

## Technologies Covered
- Amazon Aurora
- Aurora I/O-Optimized storage
- AWS RDS
- AWS Cost Explorer API
- Boto3 for Python
- AWS CLI
- Amazon CloudWatch billing and RDS metrics

## Sources Consulted
- Amazon Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- Amazon Aurora storage configurations: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- AWS CLI `modify-db-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster.html
- Boto3 / botocore Cost Explorer `get_cost_and_usage` reference: https://docs.aws.amazon.com/botocore/latest/reference/services/ce/client/get_cost_and_usage.html
- CloudWatch billing alarm documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html
- Amazon Aurora CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon CloudWatch dimensions for Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html

## Issues Found
- The post stated that Aurora I/O-Optimized storage is approximately 2.5x the standard storage price. AWS pricing examples use $0.10 per GB-month for Aurora Standard and $0.225 per GB-month for I/O-Optimized in US East, which is approximately 2.25x. Updated the pricing description, Mermaid diagram, Python estimator, and scenario calculations.
- The post described switching to I/O-Optimized as always having zero downtime. AWS documents no downtime for non-NVMe-based DB instances, but NVMe-based DB instances require a database engine restart that can cause brief downtime. Added this caveat.
- The post said you can only switch storage types once every 30 days when switching back. AWS documents that switching from I/O-Optimized to Standard is allowed at any time, while switching from Standard to I/O-Optimized is limited to once every 30 days. Corrected the switching-back section.
- The Cost Explorer script did not handle paginated `get_cost_and_usage` results. Added `NextPageToken` handling so grouped usage-type costs are not silently truncated.
- The CloudWatch billing alarm example omitted the US East (N. Virginia) region requirement and the `Currency=USD` dimension. Added `--region us-east-1`, the `Currency` dimension, and a note that billing alerts must be enabled first.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI examples were checked against the official AWS CLI documentation rather than local `aws help`.
- The Cost Explorer script is a practical estimate based on account-level RDS billing usage types. In accounts with multiple RDS engines or clusters, tagging or additional Cost Explorer filters may be needed for per-cluster analysis.
