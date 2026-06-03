# Validation Summary: How to Use CloudWatch Metrics Math Expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch
- CloudWatch Metric Math
- AWS CLI
- CloudWatch alarms
- CloudWatch dashboards
- CloudWatch anomaly detection

## Sources Consulted
- AWS CloudWatch User Guide: Using math expressions with CloudWatch metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- AWS CLI Command Reference: cloudwatch get-metric-data: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CloudWatch User Guide: Dashboard Body Structure and Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch User Guide: Metric Widget Structure and Syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Metric-Widget-Structure.html
- AWS CloudWatch User Guide: Create a CloudWatch alarm based on anomaly detection: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Anomaly_Detection_Alarm.html

## Issues Found
- The first `get-metric-data` example comment said it created a dashboard widget, but the command fetches metric data. Changed the comment to describe fetching the error-rate percentage.
- The `MAX(m1, m2)` and `MIN(m1, m2)` examples used an invalid argument shape for CloudWatch Metric Math. Changed them to `MAX([m1, m2])` and `MIN([m1, m2])`.
- The statistical function descriptions incorrectly described single-series functions as operating across search expression results. Updated the examples to distinguish single time series behavior from `METRICS()` array behavior.
- The metric alarm example did not explicitly set `ReturnData: true` on the expression the alarm watches. Added it to match the `PutMetricAlarm` requirements.
- The anomaly detection alarm example omitted `ReturnData: false` on the anomaly band expression. Added it so only the watched expression is returned as the alarm value while `ad1` remains the threshold metric ID.
- The dashboard source snippet contained a `//` comment inside a `json` code block. Removed the comment so the snippet is valid JSON.
- The time-period comparison section described a non-existent `METRICS()` time-offset usage. Replaced it with separate `get-metric-data` queries using different absolute time ranges.
- The best-practice section stated that all metrics in an expression must use the same period. Revised this to recommend compatible periods and resolutions, since CloudWatch supports per-metric periods but mixed periods can produce sparse or unexpected results.
- The division best-practice section referred to NaN values. Updated it to match CloudWatch behavior, where divide-by-zero data points are dropped.

## Review Notes
- Search expressions are valid in CloudWatch graphs, dashboards, and `GetMetricData`, but CloudWatch alarms require the watched expression to return a single time series.
- `RUNNING_SUM`, scalar `MIN`/`MAX`/`AVG`/`SUM`, and similar functions can behave differently in alarms because CloudWatch retrieves extra data points during alarm evaluation. The post does not rely on those functions in alarm examples.
