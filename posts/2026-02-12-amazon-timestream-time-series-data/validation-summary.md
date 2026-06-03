# Validation Summary: How to Use Amazon Timestream for Time-Series Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Timestream for LiveAnalytics
- AWS CLI
- Boto3 for Python
- Timestream SQL query language
- Scheduled queries
- Time-series data modeling

## Sources Consulted
- AWS CLI Command Reference: `timestream-write create-table` - https://awscli.amazonaws.com/v2/documentation/api/2.15.10/reference/timestream-write/create-table.html
- AWS CLI Command Reference: `timestream-query create-scheduled-query` - https://docs.aws.amazon.com/cli/latest/reference/timestream-query/create-scheduled-query.html
- Boto3 Timestream Write `write_records` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/timestream-write/client/write_records.html
- Amazon Timestream RetentionProperties API reference - https://docs.aws.amazon.com/timestream/latest/developerguide/API_RetentionProperties.html
- Amazon Timestream data modeling guide - https://docs.aws.amazon.com/timestream/latest/developerguide/data-modeling.html
- Amazon Timestream queries guide - https://docs.aws.amazon.com/timestream/latest/developerguide/queries.html
- Amazon Timestream query best practices - https://docs.aws.amazon.com/timestream/latest/developerguide/queries-bp.html
- Amazon Timestream aggregate functions reference - https://docs.aws.amazon.com/timestream/latest/developerguide/aggregate-functions.html
- Amazon Timestream interpolation functions reference - https://docs.aws.amazon.com/timestream/latest/developerguide/timeseries-specific-constructs.functions.interpolation.html
- Amazon Timestream date and time functions reference - https://docs.aws.amazon.com/timestream/latest/developerguide/date-time-functions.html
- Amazon Timestream scheduled queries guide - https://docs.aws.amazon.com/timestream/latest/developerguide/scheduledqueries.html
- Amazon Timestream scheduled-query data model mappings - https://docs.aws.amazon.com/timestream/latest/developerguide/scheduledqueries-mappings.html
- Amazon Timestream pricing page - https://aws.amazon.com/timestream/pricing/

## Issues Found
- The "latest CPU usage for each server" SQL example sorted all CPU rows by time but did not return one latest row per server. Changed it to group by `hostname` and use `max_by(measure_value::double, time)` with `max(time)`, matching Timestream's documented aggregate functions.
- The `create-scheduled-query` AWS CLI example omitted `--error-report-configuration`, which is a required parameter in the current AWS CLI reference. Added an S3 error report configuration to make the command complete.
- The cost tip said Timestream charges per byte scanned for queries. Current AWS pricing describes query charges based on Timestream Compute Unit duration, while AWS query best practices still warn that unnecessary columns increase data scans and query work. Updated the wording to avoid the outdated pricing claim.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against AWS's official CLI and API documentation. The Python examples use current Boto3 request shapes for single-measure and multi-measure writes. The simplified query result parser handles scalar query examples but would need extra handling for complex Timestream result types such as time series values.
