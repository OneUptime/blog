# Validation Summary: How to Use EMR Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EMR Serverless
- AWS CLI
- Apache Spark / PySpark
- Apache Hive
- Amazon S3
- AWS Glue Data Catalog
- Amazon CloudWatch Logs
- AWS IAM

## Sources Consulted
- AWS CLI Command Reference: `emr-serverless create-application` - https://docs.aws.amazon.com/cli/latest/reference/emr-serverless/create-application.html
- AWS CLI Command Reference: `emr-serverless start-job-run` - https://docs.aws.amazon.com/cli/latest/reference/emr-serverless/start-job-run.html
- AWS CLI Command Reference: `emr-serverless update-application` - https://docs.aws.amazon.com/cli/latest/reference/emr-serverless/update-application.html
- Amazon EMR Serverless User Guide: Getting started from the AWS CLI - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/gs-cli.html
- Amazon EMR Serverless User Guide: Understanding application behavior - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/app-behavior.html
- Amazon EMR Serverless User Guide: Pre-initialized capacity - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/pre-init-capacity.html
- Amazon EMR Serverless User Guide: Storing logs - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/logging.html
- Amazon EMR Serverless User Guide: Using Hive configurations - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-hive.html
- Amazon EMR Serverless API Reference: UpdateApplication - https://docs.aws.amazon.com/emr-serverless/latest/APIReference/API_UpdateApplication.html
- Amazon EMR Serverless release versions: EMR Serverless 7.0.0 - https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/release-version-700.html

## Issues Found
- The pre-initialized capacity section implied that `update-application` could be run at any time. AWS documents that an EMR Serverless application must be in the `CREATED` or `STOPPED` state to be updated, so the post now states that requirement before the command.
- The Hive job section did not make clear that the Hive job must run against an application created with `--type HIVE`, while the earlier application example creates a Spark application. The wording now explicitly says to use a Hive application ID.
- The IAM policy for CloudWatch logging omitted `logs:DescribeLogGroups` and used a log group ARN that did not include the log-stream suffix pattern AWS shows for `PutLogEvents`, `CreateLogStream`, and related log stream operations. The policy now includes `logs:DescribeLogGroups` and uses a stream-capable CloudWatch Logs ARN pattern.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against the official AWS CLI and EMR Serverless documentation. The PySpark examples are syntactically valid and use current Spark SQL APIs for Spark 3.5.0 in EMR Serverless 7.0.0. EMR Serverless has newer release labels available as of this review date, but `emr-7.0.0` remains a documented EMR Serverless release, so the version-specific examples are not outdated.
