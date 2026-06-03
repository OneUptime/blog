# Validation Summary: How to Apply the Sustainability Pillar on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Framework Sustainability pillar
- AWS Customer Carbon Footprint Tool and AWS Sustainability
- Amazon CloudWatch dashboards and metrics
- Amazon EC2 Auto Scaling
- AWS Graviton, Amazon EC2, Amazon RDS, ElastiCache, and AWS Lambda
- Amazon ECS on Fargate
- Amazon DynamoDB TTL and on-demand billing
- Amazon S3 Lifecycle
- Amazon CloudFront compression
- Terraform AWS Provider

## Sources Consulted
- AWS Well-Architected Framework, Sustainability Pillar design principles: https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/design-principles-for-sustainability-in-the-cloud.html
- AWS Sustainability user guide and methodology: https://docs.aws.amazon.com/sustainability/latest/userguide/what-is-sustainability.html and https://docs.aws.amazon.com/sustainability/latest/userguide/methodology.html
- AWS Customer Carbon Footprint Tool methodology: https://sustainability.aboutamazon.com/aws-customer-carbon-footprint-methodology.pdf
- AWS Graviton product page: https://aws.amazon.com/ec2/graviton/
- AWS Lambda CloudWatch concurrency metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon EC2 CloudWatch metric dimensions: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon EC2 Auto Scaling scheduled scaling: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon RDS for PostgreSQL release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html
- Amazon CloudFront compressed files documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
- Terraform AWS Provider docs for aws_db_instance, aws_lambda_function, aws_s3_bucket_lifecycle_configuration, aws_cloudfront_distribution, aws_autoscaling_schedule, aws_autoscaling_policy, aws_ecs_service, aws_dynamodb_table, and aws_elasticache_replication_group: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r

## Issues Found
- The RDS Terraform example omitted required creation inputs for a new DB instance. Added `allocated_storage`, `username`, and `manage_master_user_password = true`.
- The RDS example used PostgreSQL `15.4`, which has reached the end of standard support for that minor release. Updated it to PostgreSQL `15.17`, which is listed in the current Amazon RDS for PostgreSQL release calendar.
- The Lambda Terraform example omitted required function creation inputs. Added `role`, `filename`, and `source_code_hash` placeholders so the resource shape matches Terraform AWS Provider requirements.
- The CloudFront comment said `compress = true` enables gzip and Brotli. Terraform's `compress` argument enables automatic compression for requests with `Accept-Encoding: gzip`; Brotli support is controlled through cache policy settings. Updated the comment accordingly.
- The storage section described `GLACIER_IR` as "lower carbon", which is not stated as a storage-class-specific guarantee in the official docs. Changed the comment to "lower storage cost."
- The compression subsection said "in transit and at rest" but the CloudFront example covers transfer compression. Changed the subsection heading to "Compress data in transit."

## Review Notes
Some snippets are intentionally partial and reference surrounding resources such as IAM roles, subnets, load balancers, task definitions, and cache policies. The examples are technically plausible with those dependencies supplied. Region carbon intensity changes over time; future edits should avoid hard-coding "greenest" region lists unless tied to a dated data source.
