# Validation Summary: How to Use AWS Application Cost Profiler

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Cost Profiler
- AWS CLI
- Amazon S3
- AWS Cost and Usage Report
- AWS Lambda
- Amazon DynamoDB
- Amazon EventBridge
- Amazon Athena
- Python / boto3

## Sources Consulted
- AWS Application Cost Profiler product page: https://aws.amazon.com/aws-cost-management/aws-application-cost-profiler/
- AWS CLI Command Reference for Application Cost Profiler: https://docs.aws.amazon.com/cli/latest/reference/applicationcostprofiler/index.html
- AWS CLI Command Reference for put-report-definition: https://docs.aws.amazon.com/cli/latest/reference/applicationcostprofiler/put-report-definition.html
- AWS CLI Command Reference for import-application-usage: https://docs.aws.amazon.com/cli/latest/reference/applicationcostprofiler/import-application-usage.html
- AWS CLI Command Reference for list-report-definitions: https://docs.aws.amazon.com/cli/latest/reference/applicationcostprofiler/list-report-definitions.html
- AWS Cloud Operations Blog, Application Cost Profiler report output format: https://aws.amazon.com/blogs/mt/elb-access-logs-and-aws-application-cost-profiler-track-tenant-cost-of-shared-aws-infrastructure/
- AWS re:Post discussion noting Application Cost Profiler discontinuation: https://repost.aws/questions/QUoPmTa29-QPmbxroHPSRiaQ/how-to-feed-x-ray-data-to-the-aws-cost-profiler

## Issues Found
- AWS Application Cost Profiler has been discontinued. Official AWS product pages state that the service was discontinued on September 30, 2024 and no longer accepts new customers, so a 2026 tutorial explaining how to set it up is no longer technically useful for current readers.
- The post creates two report definitions, but AWS CLI documentation for list-report-definitions states that the maximum number of Application Cost Profiler reports is one.
- The usage-reporting examples only upload JSON objects to S3. The AWS CLI documentation says usage data must be ingested with import-application-usage after the object exists in S3, so the examples would not actually submit the data to Application Cost Profiler.
- The sample usage record fields do not match the documented field names shown in AWS examples and output docs. AWS examples use fields such as ApplicationId, TenantId, TenantDesc, UsageAccountId, StartTime, EndTime, ResourceId, and Name, while the post uses applicationId, type, startTime, endTime, and usageQuantity.
- The report column examples and Athena query use simplified column names such as application_id and cost. AWS report examples use columns such as ApplicationIdentifier, TenantIdentifier, ResourceId, TenantAttributionPercent, UsageAmount, and TenantCost.

## Review Notes
No README changes were made because the central issue is that the service itself is retired and the post should be removed or replaced with guidance for supported cost-allocation approaches.
