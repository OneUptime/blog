# Validation Summary: How to Use RDS Performance Insights to Identify Slow Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS Performance Insights
- Amazon CloudWatch Database Insights
- AWS Performance Insights API
- boto3 for Python
- SQL query optimization
- Database indexes, execution plans, waits, and locking

## Sources Consulted
- Amazon RDS User Guide: Overview of Performance Insights on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- Amazon RDS User Guide: Database load and Average Active Sessions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html
- Amazon RDS User Guide: Maximum CPU - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.MaxCPU.html
- Amazon RDS User Guide: Analyzing queries with the Top SQL tab - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzeDBLoad.AdditionalMetrics.html
- Amazon RDS User Guide: Viewing and downloading SQL text in the Performance Insights dashboard - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/view-download-text.html
- Amazon RDS User Guide: SQL statistics for Performance Insights - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/sql-statistics.html
- Amazon RDS User Guide: SQL statistics for MariaDB and MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzeDBLoad.AdditionalMetrics.MySQL.html
- Amazon RDS User Guide: SQL statistics for RDS PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzeDBLoad.AdditionalMetrics.PostgreSQL.html
- boto3 PI client get_resource_metrics reference - https://docs.aws.amazon.com/boto3/latest/reference/services/pi/client/get_resource_metrics.html
- Amazon RDS Performance Insights API Reference: GetDimensionKeyDetails - https://docs.aws.amazon.com/performance-insights/latest/APIReference/API_GetDimensionKeyDetails.html
- AWS RDS instance types - https://aws.amazon.com/rds/instance-types/

## Issues Found
- The boto3 `get_resource_metrics` example used a response shape with `Groups` nested inside each data point. Official boto3 documentation shows that grouped metrics are returned as separate `MetricList` entries, with dimensions in `metric['Key']['Dimensions']` and timestamp/value pairs in `metric['DataPoints']`. Updated the loop to read SQL dimensions from each metric entry and AAS from `data_point['Value']`.
- The post did not mention AWS's announced June 30, 2026 end of support for the Performance Insights console experience and flexible retention periods. Added a short note that the API continues to exist and that AWS recommends CloudWatch Database Insights for the newer console experience.
- The workflow recommended `EXPLAIN ANALYZE` without qualifying that command by database engine. Updated the wording to allow each engine's equivalent execution plan command.

## Review Notes
The SQL examples are illustrative and broadly valid for common RDS engines, but index behavior and execution plan syntax vary by engine. Performance Insights SQL statistics are also engine-specific; for example, MySQL and MariaDB collect SQL statistics at the digest level, while PostgreSQL exposes a different set of per-call digest metrics.
