# Validation Summary: Application Showback from Kubernetes Labels and Shared RDS Costs

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes labels and pod templates
- Kubernetes Metrics API and metrics-server
- Kubernetes CPU and memory requests and usage
- AWS Cost and Usage Reports
- AWS cost allocation tags
- Amazon RDS
- Amazon CloudWatch Database Insights
- Amazon CloudWatch metrics for RDS
- FinOps allocation and showback
- YAML

## Sources Consulted

- Kubernetes recommended labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes resource management for pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes tools for monitoring resources: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/
- AWS tagging Amazon RDS resources: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html
- AWS user-defined cost allocation tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html
- AWS Cost and Usage Report line item details: https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html
- AWS Cost and Usage Report reservation details: https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html
- AWS amortized reservation data: https://docs.aws.amazon.com/cur/latest/userguide/amortized-reservation.html
- AWS monitoring Amazon RDS with CloudWatch Database Insights: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DatabaseInsights.html
- AWS CloudWatch Database Insights: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html
- AWS CloudWatch Database Insights instance dashboard: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights-Database-Instance-Dashboard.html
- AWS CloudWatch dimensions for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/dimensions.html
- AWS CloudWatch metrics for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS Performance Insights overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- AWS Performance Insights dashboard dimensions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.Components.html
- FinOps Foundation Allocation capability: https://www.finops.org/framework/capabilities/allocation/

## Issues Found

- The post attributed a PostgreSQL and SQL Server application dimension to Database Insights based on the legacy Performance Insights dashboard documentation. The current CloudWatch Database Insights instance dashboard lists the DB Load application dimension only for Aurora PostgreSQL. Updated the wording to use the correct product name and current engine limitation, and replaced the legacy dashboard link with the current Database Insights dashboard link.
- The allocation formula divided the full pool by only the known applications' driver quantities, which would scale known consumers to absorb unattributed demand and contradicted the following coverage guidance. Added unattributed driver quantity to the denominator, specified that its share remains in `unallocated-rds`, and covered the zero-driver case.

## Review Notes

AWS has announced that the Performance Insights console experience will end on July 31, 2026 and redirect to CloudWatch Database Insights; the Performance Insights API will continue unchanged. The revised post refers to the current Database Insights interface. The YAML label fragment is syntactically valid, and its recommended and company-owned label keys conform to Kubernetes label syntax. No Kubernetes or AWS CLI commands are present to validate.
