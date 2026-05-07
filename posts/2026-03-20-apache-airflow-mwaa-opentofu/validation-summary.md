# Validation Summary: How to Deploy Apache Airflow (MWAA) with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon Managed Workflows for Apache Airflow (MWAA)
- Apache Airflow
- OpenTofu / Terraform-style HCL
- AWS IAM
- Amazon S3
- Amazon VPC
- Amazon CloudWatch
- Amazon SQS

## Sources Consulted
- AWS: Amazon MWAA execution role — https://docs.aws.amazon.com/mwaa/latest/userguide/mwaa-create-role.html
- AWS: Apache Airflow versions on Amazon MWAA — https://docs.aws.amazon.com/mwaa/latest/userguide/airflow-versions.html
- AWS: Create an Amazon MWAA environment — https://docs.aws.amazon.com/mwaa/latest/userguide/create-environment.html
- AWS: Create an Amazon S3 bucket for Amazon MWAA — https://docs.aws.amazon.com/mwaa/latest/userguide/mwaa-s3-bucket.html
- AWS: About networking on Amazon MWAA — https://docs.aws.amazon.com/mwaa/latest/userguide/networking-about.html
- AWS: Container, queue, and database metrics for Amazon MWAA — https://docs.aws.amazon.com/mwaa/latest/userguide/accessing-metrics-cw-container-queue-db.html
- AWS: Using Apache Airflow configuration options on Amazon MWAA — https://docs.aws.amazon.com/mwaa/latest/userguide/configuring-env-variables.html
- Apache Airflow 2.11.0 configuration reference — https://airflow.apache.org/docs/apache-airflow/2.11.0/configurations-ref.html
- Apache Airflow 3.0.6 configuration reference — https://airflow.apache.org/docs/apache-airflow/3.0.6/configurations-ref.html
- Terraform Registry: `aws_mwaa_environment` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/mwaa_environment
- Terraform Registry: `aws_iam_role_policy` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy

## Issues Found
- The post pinned `airflow_version = "2.8.1"`, which is not in the current AWS-supported MWAA version list. I changed it to `2.11.0`, which is still supported and matches the Airflow 2.x configuration options shown in the example.
- The execution role policy was incomplete compared with AWS’s current sample policy. It was missing `airflow:PublishMetrics`, broader S3 read/bucket permissions MWAA expects, the current CloudWatch Logs actions, `logs:DescribeLogGroups` as a separate `*`-scoped permission, and the documented SQS/KMS permissions used with AWS-owned encryption. I updated the inline policy accordingly.
- The example used `plugins_s3_path` and `requirements_s3_path` without `plugins_s3_object_version` and `requirements_s3_object_version`. AWS documents those object versions as required when those paths are specified. I removed the invalid fields and left a note explaining the requirement.
- The MWAA environment resource only depended on the bucket ARN and role ARN, so Terraform had no dependency edge to the required bucket versioning, bucket public-access block, or role-policy attachment. I added `depends_on` for those prerequisites so the example is apply-safe.
- The subnet guidance was too loose. AWS requires two private subnets in different Availability Zones, not just “at least 2 private subnets.” I corrected the inline comment and the best-practices guidance, and made `webserver_access_mode = "PRIVATE_ONLY"` explicit.
- The post referenced the `NumQueuedTasks` metric, but the current MWAA queue metric is `QueuedTasks`. I corrected the metric name.
- The inline environment-class comment implied only `mw1.small`, `mw1.medium`, and `mw1.large` were valid. I replaced it with a generic supported-class comment because AWS now supports additional classes.

## Review Notes
- As of May 7, 2026, AWS documents Apache Airflow `3.0.6` as the latest MWAA version. The post now pins `2.11.0` instead of the latest release because the example uses `scheduler.dag_dir_list_interval`, which Apache Airflow 3 documents as deprecated.
- If this example is later updated to use a customer-managed KMS key for the S3 bucket, AWS requires the MWAA environment to use the same KMS key.
