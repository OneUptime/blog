# Validation Summary: How to Fix 'Rate Exceeded' and Throttling Errors in AWS

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- AWS API throttling
- Amazon EC2
- AWS Lambda
- Amazon DynamoDB
- Amazon S3
- Amazon SES
- Amazon CloudWatch
- AWS Service Quotas
- Boto3 / botocore
- AWS SDK for JavaScript v3
- AWS CLI
- Python
- Node.js

## Sources Consulted
- AWS SDKs and Tools Reference Guide: Retry behavior: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- Boto3 documentation: Retries: https://docs.aws.amazon.com/boto3/latest/guide/retries.html
- botocore Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- Amazon EC2 Developer Guide: Request throttling for the Amazon EC2 API: https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-throttling.html
- AWS SDK for JavaScript v3 Developer Guide: Client constructors / maxAttempts: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-client-constructors.html
- Amazon DynamoDB Developer Guide: CloudWatch throttling metrics: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TroubleshootingThrottling-cloudwatch.html
- Amazon S3 User Guide: Optimizing Amazon S3 performance: https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html
- AWS Lambda Developer Guide: Understanding Lambda function scaling: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS CLI Command Reference: service-quotas list-service-quotas: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/list-service-quotas.html
- AWS CLI Command Reference: service-quotas request-service-quota-increase: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/request-service-quota-increase.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- Corrected the EC2 rate-limit description. The post described describe operations as roughly 100 requests per second, but AWS documents EC2 API throttling as token buckets. Many non-mutating actions have a 100-token bucket with a 20-token-per-second refill rate, while unfiltered and unpaginated operations such as `DescribeInstances` use a 50-token bucket with a 10-token-per-second refill rate.
- Updated the Boto3 retry example from `max_attempts` to `total_max_attempts`. In a botocore `Config` object, `max_attempts` excludes the initial request, while `total_max_attempts` includes it and matches the intended "total attempts" wording.
- Changed the retry-mode recommendation from adaptive as the blanket best choice to standard as the recommended default. AWS documents adaptive mode as specialized and appropriate only when the client/resource pooling model fits throttling-heavy use cases.
- Fixed the AWS SDK for JavaScript v3 example. The post incorrectly stated that SDK v3 uses adaptive retry by default; the snippet now explicitly uses `retryMode: 'standard'`.
- Removed an unused and misleading `ThrottlingException` import from the Node.js manual retry example.
- Updated the Service Quotas CLI example to use Lambda instead of EC2 API throttling. EC2 API throttling increases are documented as AWS Support requests, while the shown `service-quotas request-service-quota-increase` command is valid for Service Quotas-managed quotas.
- Updated the summary to recommend SDK built-in retry modes generally instead of specifically recommending adaptive retry mode for all workloads.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws help` output.
- The DynamoDB `ThrottledRequests` metric and S3 per-prefix request-rate guidance matched current AWS documentation.
