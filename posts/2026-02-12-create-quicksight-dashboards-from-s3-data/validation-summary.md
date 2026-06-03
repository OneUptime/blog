# Validation Summary: How to Create QuickSight Dashboards from S3 Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon QuickSight
- Amazon S3
- Amazon Athena
- AWS Glue Data Catalog
- AWS CLI
- SPICE
- JSON manifest files

## Sources Consulted
- AWS CLI Command Reference: quicksight create-data-source - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-source.html
- AWS CLI Command Reference: quicksight create-data-set - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-data-set.html
- AWS CLI Command Reference: quicksight create-refresh-schedule - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-refresh-schedule.html
- Amazon QuickSight API Reference: UploadSettings - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_UploadSettings.html
- Amazon QuickSight User Guide: Supported formats for Amazon S3 manifest files - https://docs.aws.amazon.com/quicksight/latest/user/supported-manifest-file-format.html
- Amazon QuickSight User Guide: Data source quotas - https://docs.aws.amazon.com/quick/latest/userguide/data-source-limits.html
- Amazon QuickSight User Guide: Supported data types and values - https://docs.aws.amazon.com/quicksight/latest/user/supported-data-types.html
- Amazon Athena User Guide: MSCK REPAIR TABLE - https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html
- Amazon Athena User Guide: CREATE TABLE - https://docs.aws.amazon.com/athena/latest/ug/create-table.html

## Issues Found
- The S3 manifest used `"containsHeader": "TRUE"`. AWS examples and accepted values use lowercase `"true"` or `"false"`, so this was changed to `"true"`.
- The S3 `InputColumns` declared CSV columns as `INTEGER` and `DECIMAL`. AWS CLI documentation notes that non-JSON S3 input columns support only `STRING`, so the columns were changed to `STRING` and corresponding `CastColumnTypeOperation` transforms were added.
- The QuickSight calculated field expressions referenced column names without field braces. The expressions were changed to `{revenue} - {cost}` and `({revenue} - {cost}) / {revenue} * 100`.
- The Athena example created a partitioned Glue table but did not register S3 partitions before querying. Added an `aws athena start-query-execution` example using `MSCK REPAIR TABLE sales_events`.
- The refresh schedule comment said 7 AM UTC, but the schedule omitted `Timezone`. Added `"Timezone": "UTC"` to make the example explicit.
- The decision table listed direct S3 as "Under 10 GB" and Athena as "Any size". Current SPICE quotas are larger and still apply to SPICE imports, so the table now says direct S3 must fit within SPICE quotas and Athena still has SPICE limits unless direct query is used.
- The decision table described direct S3 query cost as "Free" and Athena cost as "Per-query Athena cost". This was tightened to distinguish no Athena query cost for direct S3 from Athena costs when QuickSight runs Athena queries or refreshes SPICE.
- The decision table said schema evolution is "Handled by Glue". This was narrowed to "Managed in the Glue Data Catalog" because Glue stores and manages table metadata but does not automatically handle every schema evolution scenario without catalog updates.

## Review Notes
The post assumes prerequisite resources already exist, including the QuickSight account, namespace/user, S3 buckets, Glue database, Athena workgroup, Athena results location, IAM permissions, and QuickSight access to AWS resources. The examples are now structurally aligned with current AWS CLI and AWS service documentation, but they still use placeholder account IDs, bucket names, and ARNs that readers must replace.
