# Validation Summary: How to Use Redshift with QuickSight for BI Dashboards

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon QuickSight / Amazon Quick
- Amazon Redshift and Redshift Serverless
- AWS CLI
- QuickSight VPC connections
- QuickSight SPICE datasets and refresh schedules
- QuickSight row-level security
- Redshift SQL and materialized views

## Sources Consulted
- AWS CLI Command Reference: `quicksight create-vpc-connection` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-vpc-connection.html
- AWS CLI Command Reference: `quicksight create-data-source` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: `quicksight create-data-set` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- AWS CLI Command Reference: `quicksight create-refresh-schedule` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-refresh-schedule.html
- Amazon QuickSight / Amazon Quick VPC connection documentation - https://docs.aws.amazon.com/quicksight/latest/user/vpc-creating-a-connection-in-quicksight.html
- Amazon QuickSight / Amazon Quick security group rules for VPC connections - https://docs.aws.amazon.com/quicksight/latest/user/vpc-security-groups.html
- Amazon QuickSight / Amazon Quick row-level security documentation - https://docs.aws.amazon.com/quick/latest/userguide/restrict-access-to-a-data-set-using-row-level-security.html
- Amazon QuickSight / Amazon Quick SPICE refresh documentation - https://docs.aws.amazon.com/quicksight/latest/user/refreshing-imported-data.html
- Amazon Redshift materialized view refresh documentation - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-refresh.html
- Amazon Redshift `CREATE MATERIALIZED VIEW` documentation - https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-create-sql-command.html
- Amazon QuickSight pricing page - https://aws.amazon.com/quick/quicksight/pricing/

## Issues Found
- The intro implied QuickSight is simply charged per session. Updated it to clarify that per-session pricing applies to readers, while other pricing models also exist.
- The prerequisites said Enterprise edition was only recommended for RLS. Updated this because private VPC connections and RLS apply to Enterprise edition.
- The VPC connection JSON block was labeled as JSON but included comments, which are not valid JSON. Removed the comments from the snippet.
- The SPICE refresh schedule comment said the refresh ran at 6 AM UTC, but the command did not set a timezone. Added `"Timezone": "UTC"` to the schedule.
- The dashboard JSON was presented as a simplified template definition, but it is not a valid QuickSight `AnalysisDefinition` shape. Changed the wording so readers understand it is a conceptual layout, not an API-ready payload.
- The RLS rules table used `username`; QuickSight documentation uses `UserName`, `GroupName`, `UserARN`, or `GroupARN` for user/group rule datasets. Updated the sample to `UserName`.
- Current QuickSight RLS documentation notes that programmatically created rules datasets should be marked with `UseAs: RLS_RULES`. Added a short note after the RLS example.
- The materialized view comment said refreshes are incremental so it is always fast. Updated it to reflect Redshift's actual behavior: eligible materialized views can refresh incrementally, otherwise Redshift performs a full refresh.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against the official AWS CLI v2 command reference instead of local `aws --help` output. The internal OneUptime link is plausible and points to a related Redshift performance article.
