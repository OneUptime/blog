# Validation Summary: How to Visualize AWS Costs with QuickSight

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon QuickSight / Amazon Quick Suite
- AWS Cost and Usage Reports
- Amazon Athena
- AWS CLI
- boto3 for Python
- SPICE

## Sources Consulted
- AWS CLI Command Reference: `quicksight create-data-source` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: `quicksight create-dashboard` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-dashboard.html
- AWS CLI Command Reference: `quicksight create-refresh-schedule` - https://docs.aws.amazon.com/goto/aws-cli/quicksight-2018-04-01/CreateRefreshSchedule
- AWS CLI Command Reference: `quicksight update-account-settings` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/update-account-settings.html
- AWS CLI Command Reference: `quicksight update-spice-capacity-configuration` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/update-spice-capacity-configuration.html
- boto3 QuickSight `create_analysis` documentation - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/quicksight/client/create_analysis.html
- Amazon QuickSight calculated field reference - https://docs.aws.amazon.com/quicksight/latest/user/calculated-field-reference.html
- Amazon QuickSight `percentDifference` function - https://docs.aws.amazon.com/quicksight/latest/user/percentDifference-function.html
- Amazon QuickSight `distinct_count` function - https://docs.aws.amazon.com/quicksight/latest/user/distinct_count-function.html
- Amazon QuickSight `ifelse` function - https://docs.aws.amazon.com/quicksight/latest/user/ifelse-function.html
- Amazon QuickSight row-level security documentation - https://docs.aws.amazon.com/quicksight/latest/user/row-level-security.html

## Issues Found
- The Python section said the script creates a QuickSight dashboard template, but the code creates an analysis and dashboard from an existing template ARN. Updated the wording to match the actual boto3 `SourceTemplate` usage and removed an unused `json` import.
- The calculated field examples used invalid or incomplete QuickSight syntax. Updated field references to use `{field}` notation, changed the daily average to use the documented `distinct_count` aggregate function, fixed the `percentDifference` argument order and sort-list syntax, and aggregated the numerator and denominator in the cost-per-unit expression.
- The SPICE capacity example used `update-account-settings`, which changes account settings and does not purchase SPICE capacity. Replaced it with `update-spice-capacity-configuration --purchase-mode AUTO_PURCHASE`, which is the current API for automatic SPICE capacity purchasing.
- The refresh schedule JSON used `TimeOfDay`, but the QuickSight refresh schedule API expects `TimeOfTheDay`. Updated the schedule field name.

## Review Notes
The Athena SQL is syntactically consistent with Athena/Presto-style date functions and common CUR Athena column names. The cost metric uses unblended cost for a simplified dashboard; a future enhancement could explain when to use amortized or net amortized cost fields for Savings Plans, reservations, credits, refunds, and enterprise discount reporting.
