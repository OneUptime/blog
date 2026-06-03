# Validation Summary: How to Create Glue Jobs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Glue
- AWS Glue Data Catalog
- AWS Glue Crawlers
- AWS Glue Jobs and Triggers
- AWS Glue Workflows
- Terraform AWS provider
- IAM
- Amazon S3
- PySpark
- Python Shell jobs
- Amazon EventBridge

## Sources Consulted
- AWS Glue User Guide: Configuring job properties for Spark jobs in AWS Glue - https://docs.aws.amazon.com/glue/latest/dg/add-job.html
- AWS Glue User Guide: Configuring job properties for Python shell jobs in AWS Glue - https://docs.aws.amazon.com/glue/latest/dg/add-job-python.html
- AWS Glue User Guide: Enabling the Apache Spark web UI for AWS Glue jobs - https://docs.aws.amazon.com/glue/latest/dg/monitor-spark-ui-jobs.html
- AWS Glue User Guide: Using job parameters in AWS Glue jobs - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html
- AWS Glue User Guide: AWS Glue triggers - https://docs.aws.amazon.com/glue/latest/dg/about-triggers.html
- AWS Glue API Reference: Triggers and Condition - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-trigger.html
- AWS Glue User Guide: Setting up and configuring IAM permissions for AWS Glue - https://docs.aws.amazon.com/glue/latest/dg/set-up-iam.html
- AWS Glue User Guide: Crawler grouping policy - https://docs.aws.amazon.com/glue/latest/dg/crawler-grouping-policy.html
- AWS Glue User Guide: Data format options for AWS Glue Spark jobs - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format.html
- Amazon S3 User Guide: Policies and permissions in Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-policy-language-overview.html
- Terraform AWS Provider documentation: aws_glue_job, aws_glue_crawler, aws_glue_trigger, aws_glue_catalog_database, aws_glue_catalog_table, aws_glue_workflow - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The IAM S3 policy combined bucket-level `s3:ListBucket` with object-level `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` resources in a single statement. I split the policy into separate bucket ARN and object ARN statements so each S3 action uses the correct resource type.
- The Glue Workflow section claimed the workflow chained a crawler and two jobs, but the Terraform example only included the crawler and transform job. I added the missing conditional workflow trigger that starts the `daily_report` job after `transform_events` succeeds.

## Review Notes
Glue version `4.0` and Python Shell `3.9` remain valid, though AWS Glue now documents newer Spark runtimes such as Glue `5.x`. The post's examples are still technically correct as a Glue 4.0 tutorial.
