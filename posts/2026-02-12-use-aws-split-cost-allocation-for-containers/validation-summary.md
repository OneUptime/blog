# Validation Summary: How to Use AWS Split Cost Allocation for Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Split Cost Allocation Data
- AWS Cost and Usage Report (CUR) and CUR 2.0
- AWS Billing and Cost Management Data Exports
- Amazon ECS
- Amazon EKS
- AWS Batch
- Amazon Athena SQL
- AWS CLI

## Sources Consulted
- AWS Data Exports: Understanding split cost allocation data - https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html
- AWS Data Exports: Enabling split cost allocation data - https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html
- AWS Data Exports: Split line item details - https://docs.aws.amazon.com/cur/latest/userguide/split-line-item-columns.html
- AWS Data Exports: CUR 2.0 table dictionary - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2.html
- AWS Data Exports: CUR 2.0 split line item columns - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-split-line-item.html
- AWS Data Exports: Resource tags columns - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-resource-tags.html
- AWS Data Exports: Data query SQL and table configurations - https://docs.aws.amazon.com/cur/latest/userguide/dataexports-data-query.html
- AWS CLI Command Reference: bcm-data-exports create-export - https://docs.aws.amazon.com/cli/latest/reference/bcm-data-exports/create-export.html
- Amazon ECS Developer Guide: Amazon ECS usage reports - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/usage-reports.html
- Amazon ECS Developer Guide: Tagging Amazon ECS resources - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html
- Amazon EKS User Guide: View costs by Pod in AWS billing with split cost allocation - https://docs.aws.amazon.com/eks/latest/userguide/cost-monitoring-aws.html
- AWS Data Exports: Using split cost allocation data with Amazon CloudWatch Container Insights - https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data-cloudwatch.html

## Issues Found
- The post claimed allocation is based only on actual CPU and memory usage. Updated it to include usage, reservations, and Kubernetes requests because AWS uses different inputs depending on ECS/EKS and the selected measurement option.
- The supported platforms list included EKS on Fargate and omitted AWS Batch. Updated the list to match AWS documentation for ECS including Fargate, AWS Batch, and EKS.
- The Step 1 CLI example used `aws ce update-cost-allocation-tags-status`, which activates cost allocation tags but does not enable Split Cost Allocation Data. Replaced it with the documented Cost Management preferences flow and clarified that tag activation is separate.
- The EKS Helm installation for a Split Cost Allocation Data Agent was not supported by the current AWS docs. Replaced it with the documented EKS measurement options: resource requests, Amazon Managed Service for Prometheus, and CloudWatch Container Insights.
- The CUR 2.0 export query selected nonexistent columns: `split_line_item_task_id` and `split_line_item_reserved_usage_split_cost`. Replaced them with documented columns such as `line_item_resource_id`, `split_line_item_split_cost`, `split_line_item_unused_cost`, and `split_line_item_split_usage`.
- The split cost column table described nonexistent or misleading fields. Updated the table to use documented split line item columns and descriptions.
- The Athena examples used flattened tag column names and the nonexistent `split_line_item_task_id`. Updated the queries to use CUR 2.0 map access for `resource_tags` and `line_item_resource_id`.
- The unallocated cost section incorrectly stated that idle capacity, system overhead, and daemonsets are reported as separate unallocated costs. Updated it to use AWS's documented unused cost columns, which are proportionately applied based on split usage.
- The best practices section referred to unallocated cost and EKS deployment tags imprecisely. Updated it to use unused cost terminology and consistent workload metadata.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation rather than local `--help` output. The `bcm-data-exports create-export` structure and enum values in the post match the official CLI reference after edits.
