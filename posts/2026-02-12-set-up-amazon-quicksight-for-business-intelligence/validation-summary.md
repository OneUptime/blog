# Validation Summary: How to Set Up Amazon QuickSight for Business Intelligence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon QuickSight
- AWS CLI
- SPICE datasets and refresh schedules
- QuickSight VPC connections
- QuickSight data sources and datasets
- QuickSight users, groups, and row-level security
- Amazon S3
- Amazon Athena
- Amazon RDS for PostgreSQL

## Sources Consulted
- AWS CLI Command Reference: create-account-subscription - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-account-subscription.html
- AWS CLI Command Reference: create-vpc-connection - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-vpc-connection.html
- AWS CLI Command Reference: create-data-source - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: create-data-set - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- AWS CLI Command Reference: create-refresh-schedule - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-refresh-schedule.html
- AWS CLI Command Reference: put-data-set-refresh-properties - https://docs.aws.amazon.com/cli/latest/reference/quicksight/put-data-set-refresh-properties.html
- Amazon QuickSight API Reference: CreateRefreshSchedule - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateRefreshSchedule.html
- Amazon QuickSight API Reference: RefreshSchedule - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_RefreshSchedule.html
- Amazon QuickSight API Reference: LookbackWindow - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_LookbackWindow.html
- Amazon QuickSight User Guide: Refreshing SPICE data - https://docs.aws.amazon.com/quicksight/latest/user/refreshing-imported-data.html
- Amazon QuickSight User Guide: Row-level security - https://docs.aws.amazon.com/quicksight/latest/user/restrict-access-to-a-data-set-using-row-level-security.html
- Amazon QuickSight User Guide: Configure SPICE memory capacity - https://docs.aws.amazon.com/quicksight/latest/user/managing-spice-capacity.html
- Amazon QuickSight User Guide: Configure subscriptions - https://docs.aws.amazon.com/quicksight/latest/user/buy-subscriptions.html
- Amazon QuickSight Pricing - https://aws.amazon.com/quicksight/pricing/

## Issues Found
- The incremental refresh schedule example did not configure the required dataset refresh properties and lookback window before creating an incremental schedule. Added an `aws quicksight put-data-set-refresh-properties` example with a `LookbackWindow` on `order_date`.
- The row-level security CSV used group names in the `UserName` column. Updated the example to include separate `UserName` and `GroupName` columns so user and group rules are interpreted correctly.
- The SPICE capacity wording said additional capacity is purchased in 1 GB increments. Updated it to match the current docs: administrators enter the number of gigabytes to purchase for the selected Region.
- The pricing section described QuickSight as simply per-user and implied all Readers are charged per session rather than monthly. Updated it to distinguish per-user pricing from Enterprise Edition pay-per-session or capacity pricing for Reader sessions.
- The calculated-fields cost tip implied aggregations are precomputed during import. Reworded it to recommend reusable dataset calculated columns where possible.

## Review Notes
The local workspace does not have the AWS CLI installed, so command verification was performed against the official AWS CLI and Amazon QuickSight documentation rather than local `aws --help` output.
