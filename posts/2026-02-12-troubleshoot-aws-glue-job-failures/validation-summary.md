# Validation Summary: How to Troubleshoot AWS Glue Job Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS Glue
- AWS Glue Spark ETL jobs
- AWS CLI
- Amazon CloudWatch Logs and Metrics
- Amazon S3
- IAM policies
- Amazon VPC security groups and endpoints
- PySpark
- Docker-based AWS Glue local development

## Sources Consulted
- AWS Glue worker types: https://docs.aws.amazon.com/glue/latest/dg/worker-types.html
- AWS Glue continuous logging for Glue 4.0 and earlier: https://docs.aws.amazon.com/glue/latest/dg/monitor-continuous-logging-enable.html
- AWS Glue job parameters: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html
- AWS Glue logging behavior and Glue 5.0 logging changes: https://docs.aws.amazon.com/glue/latest/dg/monitor-continuous-logging.html
- AWS Glue job and job run timeout API documentation: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-job.html
- AWS CLI update-job reference: https://docs.aws.amazon.com/cli/latest/reference/glue/update-job.html
- AWS CLI test-connection reference: https://docs.aws.amazon.com/cli/latest/reference/glue/test-connection.html
- AWS CLI reset-job-bookmark reference: https://docs.aws.amazon.com/cli/latest/reference/glue/reset-job-bookmark.html
- AWS Glue job bookmarks: https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html
- AWS Glue grouping input files: https://docs.aws.amazon.com/glue/latest/dg/grouping-input-files.html
- AWS Glue CloudWatch metrics: https://docs.aws.amazon.com/glue/latest/dg/monitoring-awsglue-with-cloudwatch-metrics.html
- AWS Glue local Docker development: https://docs.aws.amazon.com/glue/latest/dg/develop-local-docker-image.html
- AWS Glue JDBC/VPC networking: https://docs.aws.amazon.com/glue/latest/dg/connection-JDBC-VPC.html
- AWS Glue service IAM policy guidance: https://docs.aws.amazon.com/glue/latest/dg/create-service-policy.html
- Amazon CloudWatch Logs permissions reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/permissions-reference-cwl.html

## Issues Found
- The continuous logging section implied the same setup for all Glue versions. Updated it to clarify that the shown arguments apply to AWS Glue 4.0 and earlier, while AWS Glue 5.0 has real-time logging by default.
- The `update-job` example did not warn that omitted `JobUpdate` fields can be reset. Added a warning to include the rest of the existing job configuration when using `update-job`.
- The worker type guidance and table were stale. Updated the disk sizes for `G.1X` and `G.2X`, removed the outdated `Standard` row from the current worker table, and added current memory-optimized `R.1X` and `R.2X` examples.
- The timeout claim said 48 hours for most job types. Updated it to reflect the current defaults: 48 hours for Glue 4.0 and earlier, and 8 hours for Glue 5.0 and later.
- The VPC self-referencing security group example used all protocols. Updated it to use all TCP ports, matching AWS Glue VPC guidance.
- The CloudWatch Logs IAM ARN format was incorrect. Updated it to the documented Glue log group ARN pattern.
- The job bookmark support note was too vague. Updated it to reference supported bookmark sources: JDBC, Relationalize, and supported S3 formats.
- The Docker image URI used the older Docker Hub-style name. Updated it to the current AWS ECR Public image URI for AWS Glue 4.0.

## Review Notes
- The PySpark examples are syntactically valid illustrative snippets, but the salting example assumes `df_large` and `df_small` already exist and that the small side can safely be expanded by the salt range.
- The IAM policy is a baseline example only. Real jobs may need additional permissions for KMS, Secrets Manager, Lake Formation, JDBC targets, or specific Glue catalog resources.
- The local Docker environment is useful for script development, but AWS documents limitations for local containers, including unsupported job bookmarks and some Glue-specific features.
