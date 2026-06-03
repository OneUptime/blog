# Validation Summary: How to Build a Metrics Collection System on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch
- Amazon CloudWatch Agent
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon Timestream for Live Analytics
- Amazon Managed Grafana
- Amazon Managed Service for Prometheus
- Amazon SNS
- AWS SDK for JavaScript v3
- AWS CLI
- JavaScript / Node.js

## Sources Consulted
- Amazon CloudWatch Agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Amazon CloudWatch metrics concepts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- CloudWatch Metrics Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html
- Amazon Kinesis Data Streams PutRecords API: https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html
- Amazon Timestream queries: https://docs.aws.amazon.com/timestream/latest/developerguide/queries.html
- Amazon Timestream WriteRecords API: https://docs.aws.amazon.com/timestream/latest/developerguide/API_WriteRecords.html
- AWS CLI timestream-write create-table: https://docs.aws.amazon.com/cli/latest/reference/timestream-write/create-table.html
- AWS CLI grafana create-workspace: https://docs.aws.amazon.com/cli/latest/reference/grafana/create-workspace.html
- Amazon Managed Grafana CreateWorkspace API: https://docs.aws.amazon.com/grafana/latest/APIReference/API_CreateWorkspace.html
- Amazon Managed Service for Prometheus overview: https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html
- Amazon Timestream pricing: https://aws.amazon.com/timestream/pricing/
- Amazon Managed Service for Prometheus pricing: https://aws.amazon.com/prometheus/pricing/
- AWS SDK for JavaScript v3 Kinesis examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_kinesis_code_examples.html
- AWS SDK for JavaScript v3 Timestream write client: https://docs.aws.amazon.com/timestream/latest/developerguide/code-samples.write-client.html
- Referenced OneUptime logging guide: https://oneuptime.com/blog/post/2026-02-12-build-a-log-aggregation-system-on-aws/view

## Issues Found
- The metrics store comparison listed CloudWatch's query language as "CloudWatch Insights." CloudWatch Metrics uses GetMetricStatistics and Metrics Insights, while CloudWatch Logs Insights is for logs. Updated the table accordingly.
- The Managed Prometheus retention value was listed as a fixed "150 days." Amazon Managed Service for Prometheus stores metrics for 150 days by default, but retention is configurable up to 1095 days. Updated the table.
- The cost model for Timestream omitted query costs, and the Managed Prometheus cost model omitted storage and query costs. Updated the table to include those billing dimensions.
- The Amazon Managed Grafana CLI command used `SERVICE_MANAGED` permissions and `--workspace-data-sources`. AWS documentation says CLI-created workspaces should use customer-managed permissions, and `workspace-data-sources` is internal-use only. Updated the command to use `CUSTOMER_MANAGED` with a workspace IAM role and added a short note to add data sources after workspace creation.

## Review Notes
- The JavaScript examples use AWS SDK for JavaScript v3 command clients and are syntactically valid CommonJS examples.
- The Kinesis producer example batches at 500 records, which matches the PutRecords API limit. Production code should also inspect partial failures in the PutRecords response and retry failed records.
- The Timestream writer batches at 100 records, which matches the WriteRecords API limit.
- The Timestream SQL examples use supported constructs such as `BIN`, `ago`, dimension columns, `measure_value::double`, and `APPROX_PERCENTILE`.
- The local environment did not have the AWS CLI installed, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
