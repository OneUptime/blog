# Validation Summary: How to Analyze S3 Access Logs with Athena

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 server access logs
- Amazon Athena
- AWS CLI
- SQL
- RegexSerDe
- Athena partition projection

## Sources Consulted
- Amazon S3 User Guide: Using Amazon S3 server access logs to identify requests - https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-s3-access-logs-to-identify-requests.html
- Amazon S3 User Guide: Amazon S3 server access log format - https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html
- AWS CLI Command Reference: athena start-query-execution - https://docs.aws.amazon.com/cli/latest/reference/athena/start-query-execution.html
- Amazon Athena User Guide: Athena engine version 3 functions - https://docs.aws.amazon.com/athena/latest/ug/functions-env3.html
- Amazon Athena pricing - https://aws.amazon.com/athena/pricing/

## Issues Found
- The S3 access log schema omitted the current `source_region` field. Added `source_region string` to both Athena table definitions so they match the current S3 server access log field list.
- The RegexSerDe pattern did not match AWS's current extensible S3 access log format and could fail or drop fields when newer optional fields are present. Replaced it with the current AWS-style pattern that captures the first 18 fields and optionally captures the extended fields through `source_region`.
- The sample queries compared `request_datetime` to ISO date strings such as `2026-02-01`. S3 access logs store timestamps as strings in the format `dd/MMM/yyyy:HH:mm:ss Z`, so those filters were lexicographic rather than chronological. Updated the date filters and timestamp ordering to use Athena's `parse_datetime` with the S3 log timestamp format.
- The unusual IP query used `MIN(request_datetime)` and `MAX(request_datetime)` on string timestamps. Updated those expressions to aggregate parsed timestamps.
- The partitioned table example declared a partition column but did not include a usable partition mapping. Added partition projection properties and clarified that the example assumes date-based log prefixes like `logs/my-source-bucket/2026/02/01/`.

## Review Notes
- The AWS CLI `aws athena start-query-execution` options shown in the post are current.
- Athena pricing is stated accurately for the standard $5 per TB scanned SQL query pricing model, though actual request and transfer costs vary by AWS Region, storage class, and current S3 pricing.
