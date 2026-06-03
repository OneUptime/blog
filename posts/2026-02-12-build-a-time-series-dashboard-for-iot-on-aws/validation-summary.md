# Validation Summary: How to Build a Time-Series Dashboard for IoT on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS IoT Core
- Amazon Timestream for LiveAnalytics
- Amazon Managed Grafana
- AWS Lambda
- Amazon SNS
- AWS CloudFormation
- Python / boto3
- Grafana dashboard variables and macros

## Sources Consulted
- AWS IoT Core Timestream rule action documentation: https://docs.aws.amazon.com/iot/latest/developerguide/timestream-rule-action.html
- Amazon Timestream for LiveAnalytics availability change: https://docs.aws.amazon.com/timestream/latest/developerguide/AmazonTimestreamForLiveAnalytics-availability-change.html
- Amazon Timestream storage documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/storage.html
- Amazon Timestream writes and multi-measure records documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/writes.html
- Amazon Timestream quotas documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/ts-limits.html
- Amazon Timestream WriteRecords API documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/API_WriteRecords.html
- Amazon Timestream aggregate functions documentation: https://docs.aws.amazon.com/timestream/latest/developerguide/aggregate-functions.html
- AWS::IoT::TopicRule TimestreamAction CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iot-topicrule-timestreamaction.html
- AWS::IoT::TopicRule TimestreamTimestamp CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-iot-topicrule-timestreamtimestamp.html
- AWS::Grafana::Workspace CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-grafana-workspace.html
- Amazon Managed Grafana Timestream data source documentation: https://docs.aws.amazon.com/grafana/latest/userguide/timestream-datasource.html
- Amazon Managed Grafana Timestream query editor and macro documentation: https://docs.aws.amazon.com/grafana/latest/userguide/timestream-query-editor.html
- Amazon Managed Grafana variable syntax documentation: https://docs.aws.amazon.com/grafana/latest/userguide/v10-dash-variable-syntax.html

## Issues Found
- The post presented Amazon Timestream for LiveAnalytics as generally available for new AWS customers. AWS closed new customer access on June 20, 2025, so I added a caveat that the architecture applies to existing Timestream for LiveAnalytics customers and that new customers should evaluate Timestream for InfluxDB or another time-series store.
- The post claimed memory-store queries provide sub-millisecond latency. AWS documents the memory store as optimized for fast point-in-time queries, so I changed this to "low-latency point-in-time queries."
- The IoT rule used `SELECT *` and described writing all numeric fields as measures. AWS IoT's Timestream action writes each selected attribute as an individual record with `measure_name` and `measure_value::*`, so I changed the SQL to select telemetry measures explicitly and corrected the explanation.
- The Timestream dashboard and anomaly queries assumed multi-measure columns such as `temperature` and `humidity`, which would not work for records written directly by the AWS IoT Timestream rule action. I rewrote those queries to filter by `measure_name` and read `measure_value::double`.
- The Grafana CloudFormation example used `SERVICE_MANAGED` with `DataSources`, but AWS documents the `DataSources` list as only used for console-created service-managed workspaces. I changed the snippet to `CUSTOMER_MANAGED` with `RoleArn`, matching the supplied role-based setup.
- The Grafana query used `IN ($devices)`, which can produce invalid SQL for multi-value variables. I changed it to `${devices:singlequote}` based on Amazon Managed Grafana's documented variable formatting syntax.
- Example ARNs used 9-digit account IDs. AWS account IDs are 12 digits, so I corrected the placeholders to `123456789012`.
- The Lambda anomaly-detection example queried non-existent `temperature` columns for IoT-rule-written records and interpolated the device ID directly. I updated it to query `measure_value::double`, filter `measure_name = 'temperature'`, escape single quotes in the device ID, and handle null standard deviation values.

## Review Notes
The SDK multi-measure write example is valid for programmatic writes and intentionally differs from the AWS IoT rule action's single-measure record shape. Future revisions could clarify whether the dashboard uses direct IoT-rule writes, SDK multi-measure writes, or separate tables for each ingestion path.
