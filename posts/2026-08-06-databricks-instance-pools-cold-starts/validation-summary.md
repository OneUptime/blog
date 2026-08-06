# Validation Summary: When Databricks Instance Pools Save Time and Money

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Databricks instance pools
- Databricks classic compute and autoscaling
- Databricks Runtime preloading
- AWS EC2 Spot and on-demand instances
- Cloud cost attribution and Databricks DBU billing
- Databricks resource tagging and compute system tables

## Sources Consulted

- [Connect to pools](https://docs.databricks.com/aws/en/compute/pool-index)
- [Pool configuration reference](https://docs.databricks.com/aws/en/compute/pools)
- [Pool best practices](https://docs.databricks.com/aws/en/compute/pool-best-practices)
- [Compute configuration reference](https://docs.databricks.com/aws/en/compute/configure)
- [Classic compute configuration best practices](https://docs.databricks.com/aws/en/compute/cluster-config-best-practices)
- [Use tags to attribute and track usage](https://docs.databricks.com/aws/en/admin/account-settings/usage-detail-tags)
- [Compute system tables reference](https://docs.databricks.com/aws/en/admin/system-tables/compute)
- [Best practices for cost optimization](https://docs.databricks.com/aws/en/lakehouse-architecture/cost-optimization/best-practices)

## Issues Found
No technical issues found.

## Review Notes
The post is correctly scoped to Databricks classic compute on AWS through its terminology and documentation links. Its cost formulas are conceptual decision models rather than executable code. The recommended pool-hit, latency, and idle-time measurements may require deriving metrics from cloud billing data, job or compute events, and Databricks compute system tables; they are not presented as built-in metrics. Databricks currently marks the `system.compute.instance_events` and `system.compute.instance_pools` tables as Public Preview, so implementations based on those tables should account for preview status.
