# Validation Summary: How to Use Amazon Kinesis Data Analytics with SQL

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Amazon Kinesis Data Analytics for SQL Applications
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Lambda
- AWS CLI
- Kinesis Data Analytics SQL
- CloudWatch metrics

## Sources Consulted
- AWS documentation: Amazon Kinesis Data Analytics for SQL Applications discontinuation - https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html
- AWS Big Data Blog: Migrate from Amazon Kinesis Data Analytics for SQL to Amazon Managed Service for Apache Flink and Amazon Managed Service for Apache Flink Studio - https://aws.amazon.com/blogs/big-data/migrate-from-amazon-kinesis-data-analytics-for-sql-to-amazon-managed-service-for-apache-flink-and-amazon-managed-service-for-apache-flink-studio/
- AWS CLI Command Reference: kinesisanalytics create-application - https://docs.aws.amazon.com/cli/latest/reference/kinesisanalytics/create-application.html
- AWS CLI Command Reference: kinesisanalytics add-application-output - https://docs.aws.amazon.com/cli/latest/reference/kinesisanalytics/add-application-output.html
- Amazon Kinesis Data Analytics SQL Reference: RANDOM_CUT_FOREST - https://docs.aws.amazon.com/kinesisanalytics/latest/sqlref/sqlrf-random-cut-forest.html
- Amazon Kinesis Data Analytics SQL Reference: STEP - https://docs.aws.amazon.com/kinesisanalytics/latest/sqlref/sql-reference-step.html

## Issues Found
- The tutorial is based on Amazon Kinesis Data Analytics for SQL Applications, which AWS has discontinued. AWS documentation states that new SQL applications could not be created after October 15, 2025, and that applications would be deleted starting January 27, 2026. Since this post is dated February 12, 2026 and is written as a current implementation guide, its core workflow cannot be performed.
- The AWS Big Data Blog also identifies Kinesis Data Analytics for SQL as a legacy offering and recommends migration to Amazon Managed Service for Apache Flink or Amazon Managed Service for Apache Flink Studio.
- The post includes AWS CLI examples that would not be actionable after the service discontinuation. One specific example also uses `aws kinesisanalytics add-application-output --output`, but the official AWS CLI option for this command is `--application-output`.
- No edits were made to `README.md` because the problem is not an isolated technical typo; the subject of the tutorial is no longer a usable AWS service for creating, starting, or operating SQL applications.

## Review Notes
This post should be removed or replaced with a guide for Amazon Managed Service for Apache Flink or Apache Flink Studio SQL. Existing Kinesis Data Analytics for SQL snippets may still have historical value, but they are not suitable for a current engineering tutorial as of 2026-06-03.
