# Validation Summary: How to Query Timestream with SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Timestream for LiveAnalytics
- Timestream SQL query language
- AWS CLI
- Time series analytics

## Sources Consulted
- Amazon Timestream Query language reference: https://docs.aws.amazon.com/timestream/latest/developerguide/reference.html
- Amazon Timestream Date / time functions: https://docs.aws.amazon.com/timestream/latest/developerguide/date-time-functions.html
- Amazon Timestream Date / time operators: https://docs.aws.amazon.com/timestream/latest/developerguide/date-time-operators.html
- Amazon Timestream Timeseries views: https://docs.aws.amazon.com/timestream/latest/developerguide/timeseries-specific-constructs.views.html
- Amazon Timestream Interpolation functions: https://docs.aws.amazon.com/timestream/latest/developerguide/timeseries-specific-constructs.functions.interpolation.html
- Amazon Timestream Filter and reduce functions: https://docs.aws.amazon.com/timestream/latest/developerguide/timeseries-specific-constructs.functions.filter-reduce.html
- Amazon Timestream Aggregate functions: https://docs.aws.amazon.com/timestream/latest/developerguide/aggregate-functions.html
- Amazon Timestream Window functions: https://docs.aws.amazon.com/timestream/latest/developerguide/window-functions.html
- Amazon Timestream Data modeling: https://docs.aws.amazon.com/timestream/latest/developerguide/data-modeling.html
- AWS CLI timestream-query query command reference: https://docs.aws.amazon.com/cli/latest/reference/timestream-query/query.html

## Issues Found
- The `CREATE_TIME_SERIES` statistics example attempted to call `MIN`, `MAX`, and `AVG` directly on a `timeseries` value. Timestream documents `CREATE_TIME_SERIES` as returning a `timeseries` type and `UNNEST` as the way to flatten it into `time` and `value` columns. Updated the query to `CROSS JOIN UNNEST(temp_series) AS t (time, value)` and aggregate over `t.value`.
- The rate-of-change example used `EXTRACT(EPOCH FROM time - prev_time)`, but Timestream documentation states that a timestamp cannot be subtracted from another timestamp and recommends `date_diff` for durations between timestamps. Updated the calculation to use `date_diff('second', prev_time, time) / 60.0` and added a positive-duration guard.

## Review Notes
- The AWS CLI command syntax is correct, but the local environment did not have the AWS CLI installed, so it was verified against the official AWS CLI command reference rather than local `aws --help` output.
- The examples assume a multi-measure table where `temperature`, `humidity`, and similar values are available as columns. That is consistent with Timestream's documented multi-measure model.
