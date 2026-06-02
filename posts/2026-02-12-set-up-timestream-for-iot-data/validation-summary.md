# Validation Summary: How to Set Up Timestream for IoT Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Timestream for LiveAnalytics
- AWS IoT Core rules
- AWS CLI
- AWS SDK for Python (Boto3)
- Timestream SQL
- Amazon CloudWatch metrics
- IAM roles and inline policies

## Sources Consulted
- AWS Timestream for LiveAnalytics availability change: https://docs.aws.amazon.com/timestream/latest/developerguide/AmazonTimestreamForLiveAnalytics-availability-change.html
- AWS Timestream storage documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/storage.html
- AWS Timestream WriteRecords API reference: https://docs.aws.amazon.com/timestream/latest/developerguide/API_WriteRecords.html
- Boto3 Timestream write_records documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/timestream-write/client/write_records.html
- AWS CLI create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/timestream-write/create-table.html
- AWS IoT Core Timestream rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/timestream-rule-action.html
- AWS Timestream simple query examples: https://docs.aws.amazon.com/timestream/latest/developerguide/sample-queries.basic-scenarios.html
- AWS Timestream CloudWatch metrics and dimensions: https://docs.aws.amazon.com/timestream/latest/developerguide/metrics-dimensions.html

## Issues Found
- The post referred generally to Amazon Timestream without noting the current availability status. Updated the introduction to identify the tutorial as Amazon Timestream for LiveAnalytics and added AWS's June 20, 2025 new-customer access closure note.
- The AWS IoT Core rule section implied direct IoT Core ingestion would produce the same multi-measure schema as the SDK examples. Updated the rule SQL to select only sensor measures, added the IoT SQL version, and clarified that the IoT Core Timestream action writes separate single-measure records.
- Several query examples did not filter on `measure_name = 'sensor_metrics'`, which is needed to target the multi-measure schema used by the SDK examples. Added the filter where missing.
- The anomaly detection query could divide by zero when a device has no temperature variance. Added `s.stddev_temp > 0`.
- The battery drain calculation subtracted the oldest battery value from the current battery value, producing negative drain rates for normal battery drain. Reversed the calculation so drain rate is positive when the battery level drops.
- The CloudWatch metric command used `SuccessfulRequestCount`, which is not a documented Timestream metric. Replaced it with the documented `NumberOfRecords` metric and the supported `Operation=WriteRecords` dimension.
- The batch-writing docstring mentioned `battery`, while the code expects `battery_level`. Updated the docstring.

## Review Notes
- The Python snippets were parsed with `python3` and are syntactically valid.
- The AWS CLI is not installed in this workspace, so CLI command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
- Magnetic store writes are not immediately queryable; AWS documents that records written to the magnetic store are available within 6 hours. The post correctly frames magnetic store writes as useful for late-arriving data, but a future revision could mention the query delay.
