# Validation Summary: How to Analyze AWS Cost and Usage Reports with Athena

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cost and Usage Reports
- Amazon Athena
- AWS Glue Data Catalog
- AWS CloudFormation
- AWS CLI
- SQL
- Amazon S3

## Sources Consulted
- AWS Data Exports User Guide: Querying Cost and Usage Reports using Amazon Athena - https://docs.aws.amazon.com/cur/latest/userguide/cur-query-athena.html
- AWS Data Exports User Guide: Setting up Athena using CloudFormation templates - https://docs.aws.amazon.com/cur/latest/userguide/use-athena-cf.html
- AWS Data Exports User Guide: Setting up Athena manually - https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-manual.html
- AWS Data Exports User Guide: Creating an Athena table - https://docs.aws.amazon.com/cur/latest/userguide/create-manual-table.html
- AWS Data Exports User Guide: Running Amazon Athena queries - https://docs.aws.amazon.com/cur/latest/userguide/cur-ate-run.html
- AWS Data Exports User Guide: Line item details - https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html
- AWS Data Exports User Guide: Understanding Savings Plans - https://docs.aws.amazon.com/cur/latest/userguide/cur-sp.html
- AWS Data Exports User Guide: Reservation details - https://docs.aws.amazon.com/cur/latest/userguide/reservation-columns.html
- AWS Data Exports User Guide: Pricing columns - https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-cur2-pricing.html
- Amazon Athena User Guide: CREATE TABLE - https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon Athena User Guide: CREATE TABLE AS - https://docs.aws.amazon.com/athena/latest/ug/create-table-as.html
- Amazon Athena pricing - https://aws.amazon.com/athena/pricing/
- AWS CLI Command Reference: cloudformation create-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html

## Issues Found
- Several cost queries counted only `Usage` or `Usage` plus `DiscountedUsage`, which undercounts resources covered by Savings Plans. Updated the relevant filters to include `SavingsPlanCoveredUsage`.
- Queries that claimed to show actual cost used `line_item_unblended_cost` for Reserved Instance and Savings Plans-covered usage. AWS documents `reservation/EffectiveCost` for RI discounted usage and `savingsPlan/SavingsPlanEffectiveCost` for Savings Plans-covered usage, so the examples now use those fields with sensible fallbacks.
- The Savings Plan and RI savings query attempted to calculate RI savings from `line_item_unblended_rate`, but AWS documents the unblended rate as zero for RI discounted usage. Reworked the query to compare public On-Demand cost with allocated RI or Savings Plans effective cost.
- The manual table definition did not include the pricing and effective-cost columns required by the corrected savings and actual-cost examples. Added `pricing_public_on_demand_cost`, `reservation_effective_cost`, and `savings_plan_savings_plan_effective_cost`.
- The partitioning advice said CUR data is partitioned by date and implied filtering `line_item_usage_start_date` alone reduces scanned data through partition pruning. Updated the wording to distinguish date filtering from filtering actual partition columns such as `year`, `month`, or `billing_month`.
- The team tag query treated only `NULL` tag values as untagged. Updated it to also treat empty strings as untagged.

## Review Notes
AWS now recommends Data Exports and CUR 2.0 for detailed cost and usage exports, while the legacy CUR Athena integration remains documented. The post is still technically useful, but future updates could mention CUR 2.0 and that optional CUR columns appear only when the account has relevant usage or discount data.
