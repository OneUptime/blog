# Validation Summary: How to Build a Cost Dashboard for AWS Multi-Account

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Organizations
- AWS Cost and Usage Reports
- Amazon S3
- AWS Glue Data Catalog and crawlers
- Amazon Athena
- Amazon QuickSight
- AWS Cost Explorer API
- AWS Lambda
- Amazon DynamoDB
- Amazon EventBridge
- Amazon SNS
- Amazon API Gateway
- Python / boto3
- CloudFormation

## Sources Consulted
- AWS Cost and Usage Reports overview: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html
- AWS CUR S3 bucket policy documentation: https://docs.aws.amazon.com/cur/latest/userguide/cur-s3.html
- AWS::CUR::ReportDefinition CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cur-reportdefinition.html
- AWS::Glue::Crawler CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-glue-crawler.html
- AWS::Glue::Crawler Schedule CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-glue-crawler-schedule.html
- AWS Cost Explorer API user guide: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-api.html
- boto3 Cost Explorer get_cost_and_usage reference: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html
- AWS Cost Explorer refresh behavior: https://docs.aws.amazon.com/console/billing/costexplorer
- AWS::Events::Rule CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- AWS::Lambda::Permission CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- boto3 DynamoDB Query reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/query.html
- boto3 DynamoDB Scan paginator reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/paginator/Scan.html
- AWS CUR line item columns: https://docs.aws.amazon.com/cur/latest/userguide/Lineitem-columns.html
- Amazon Athena SELECT reference: https://docs.aws.amazon.com/athena/latest/ug/select.html

## Issues Found
- The CloudFormation snippet claimed to enable CUR but only created an S3 bucket and bucket policy. Added an `AWS::CUR::ReportDefinition` resource with Parquet, Athena integration, hourly granularity, S3 prefix, report versioning, and closed-report refresh settings.
- The CUR bucket policy omitted the source account/source ARN conditions shown in AWS's default policy. Added those conditions and the policy document version.
- The post described Cost Explorer as real-time or near-real-time. AWS documents Cost Explorer refreshes cost data at least once every 24 hours, so the wording was changed to daily summaries and the EventBridge schedule was changed from every 6 hours to daily.
- The Cost Explorer boto3 examples did not handle `NextPageToken`, which can omit later pages of grouped results. Added pagination loops.
- The Cost Explorer examples relied on the ambient Lambda region even though the Cost Explorer API endpoint is in `us-east-1`. Added `region_name='us-east-1'` to the Cost Explorer clients.
- The cost aggregation example requested `UsageQuantity` but did not use it. Removed it to avoid implying cross-service usage quantities are meaningful without unit-specific filtering.
- The EC2 query was described as finding near-zero CPU, but CUR does not contain CPU utilization metrics. Updated the description to say it finds expensive EC2 running hours worth checking against CloudWatch utilization.
- The anomaly detection example could divide by zero if the previous seven-day average was zero. Added a guard before calculating the spike percentage.
- The EventBridge schedule snippet did not grant EventBridge permission to invoke Lambda. Added an `AWS::Lambda::Permission` resource.
- The DynamoDB API example did not handle `LastEvaluatedKey` for `Query` or `Scan`, so it could return only the first page. Added helper functions to paginate both operations.

## Review Notes
- Python snippets were parsed with `ast.parse` successfully after edits.
- `cfn-lint` was not installed in the workspace, so CloudFormation validation was limited to checking resource and property names against official AWS documentation.
- The `/summary` API still uses a DynamoDB table scan for simplicity. This is technically valid for a small tutorial example, but a production dashboard should use a date-oriented key or secondary index to avoid scanning the table.
