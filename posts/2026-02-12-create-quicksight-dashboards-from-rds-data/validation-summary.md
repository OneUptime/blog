# Validation Summary: How to Create QuickSight Dashboards from RDS Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon QuickSight
- Amazon RDS
- AWS CLI
- SPICE
- PostgreSQL
- MySQL
- SQL
- Amazon VPC security groups
- CloudWatch alarms

## Sources Consulted
- Amazon QuickSight supported data sources: https://docs.aws.amazon.com/quicksight/latest/user/supported-data-sources.html
- AWS CLI `quicksight create-vpc-connection`: https://docs.aws.amazon.com/quicksight/latest/user/vpc-creating-a-connection-in-quicksight-cli.html
- AWS CLI `quicksight create-data-source`: https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI `quicksight create-data-set`: https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- AWS CLI `quicksight create-refresh-schedule`: https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-refresh-schedule.html
- AWS CLI `quicksight describe-ingestion`: https://docs.aws.amazon.com/cli/latest/reference/quicksight/describe-ingestion.html
- Amazon QuickSight SPICE documentation: https://docs.aws.amazon.com/quicksight/latest/user/spice.html
- Amazon QuickSight calculated fields documentation: https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html
- AWS Business Intelligence Blog, best practices for SPICE and direct query mode: https://aws.amazon.com/blogs/business-intelligence/best-practices-for-amazon-quicksight-spice-and-direct-query-mode/

## Issues Found
- The ingestion monitoring example used `$(date +%s)` again in `describe-ingestion`, which would usually generate a different ingestion ID from the one passed to `create-ingestion`. Changed the example to store the ingestion ID in `INGESTION_ID` and reuse it.
- The refresh schedule comment said "every 4 hours during business hours", but the API payload configured a daily refresh at 08:00. Changed the comment to match the actual `DAILY` schedule.
- The direct query guidance described direct query as "up-to-the-second", which overstates the behavior. Changed it to say the data reflects the current source database without waiting for a SPICE refresh.
- The calculated fields tip said SPICE pre-computes calculated fields generally. QuickSight materializes row-level dataset calculated fields in SPICE, while aggregate calculated fields are evaluated when the analysis runs. Updated the wording to reflect that distinction.

## Review Notes
The AWS CLI examples use placeholder account IDs, subnet IDs, security group IDs, database names, and credentials, so they still require substitution before use. The local environment did not have the AWS CLI installed, so command syntax was verified against official AWS CLI documentation rather than local `aws --help` output.
