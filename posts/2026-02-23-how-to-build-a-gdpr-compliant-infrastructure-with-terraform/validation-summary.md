# Validation Summary: How to Build a GDPR Compliant Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS KMS
- Amazon RDS for PostgreSQL
- Amazon S3 lifecycle policies and versioning
- AWS CloudTrail
- Amazon VPC and VPC Flow Logs
- AWS Lambda
- Amazon SQS
- Amazon CloudWatch alarms
- Amazon SNS
- GDPR infrastructure controls

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider documentation for `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- HashiCorp AWS provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- HashiCorp AWS provider documentation for `aws_sqs_queue`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- AWS Regions and Availability Zones documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html
- Amazon S3 lifecycle configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon RDS for PostgreSQL CloudWatch log export documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- GDPR Regulation (EU) 2016/679 text: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679

## Issues Found
- The post described GDPR controls as absolute infrastructure requirements, including EU-only storage and mandatory encryption. I changed this to describe them as common technical controls that support GDPR obligations, because GDPR Article 32 is risk-based and international transfers can be lawful with appropriate safeguards.
- The introduction referred to "EU citizen data." I changed this to personal data from people in the EU or EEA, which better reflects GDPR territorial scope.
- The AWS provider section said `allowed_account_ids` enforced EU regions. I corrected the comment because that provider option validates the AWS account ID, while the variable validation enforces the allowed region list.
- The region list called London an EU region and omitted newer European AWS regions. I changed the wording to "approved European regions" and added `eu-central-2` and `eu-south-2`, matching current AWS region documentation.
- The RDS example did not set a master username or password management. I added `username`, `manage_master_user_password`, and `master_user_secret_kms_key_id`, using RDS-managed Secrets Manager credentials instead of putting a password in Terraform state.
- The DSAR Lambda example referenced an undefined `aws_secretsmanager_secret.db_credentials`. I changed it to use `aws_db_instance.personal_data.master_user_secret[0].secret_arn`, matching the RDS-managed secret configured in the database example.
- The S3 lifecycle example enabled versioning but only expired current versions. I added `noncurrent_version_expiration` and an explicit dependency on bucket versioning so noncurrent object versions are also removed after the retention period.
- The SQS example said KMS encrypted messages in transit and at rest. I clarified that KMS configures server-side encryption at rest and that SQS API calls use HTTPS for encryption in transit.
- The CloudWatch alarm example used a custom metric without explaining its source. I added a short note that the metric must be published by metric filters or application code.
- The conclusion said the Terraform configuration would "enforce GDPR compliance." I changed this to "support GDPR compliance" to avoid overstating what infrastructure alone can guarantee.

## Review Notes
The snippets are illustrative and still assume surrounding resources exist, including IAM roles, security groups, CloudWatch log groups, subnets, and Lambda deployment artifacts. Python 3.11 remains a supported AWS Lambda runtime as of 2026-05-25, but AWS recommends moving AL2-based runtimes to AL2023-based runtimes where practical.
