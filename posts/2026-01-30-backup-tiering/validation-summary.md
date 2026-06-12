# Validation Summary: How to Build Backup Tiering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon S3 storage classes and lifecycle policies
- AWS CLI and S3 API
- Terraform AWS provider S3 lifecycle configuration
- Google Cloud Storage lifecycle management and gsutil
- Azure Blob Storage lifecycle management
- Kubernetes CronJob
- Python backup tiering and cost calculators
- boto3 S3 copy operations
- Prometheus alert rules
- Amazon CloudWatch dashboards

## Sources Consulted
- AWS S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- AWS S3 Glacier storage classes and retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS CLI put-bucket-lifecycle-configuration command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI copy-object command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- boto3 S3 copy_object reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/copy_object.html
- Google Cloud Storage object lifecycle management: https://docs.cloud.google.com/storage/docs/lifecycle
- Google Cloud Storage lifecycle management command documentation: https://docs.cloud.google.com/storage/docs/managing-lifecycles
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Blob Storage lifecycle policy configuration: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-configure
- Azure Storage management policy ARM schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts/managementpolicies
- Terraform AWS provider aws_s3_bucket_lifecycle_configuration resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- AWS examples transitioned objects to S3 Standard-IA after 7 days. Updated the AWS lifecycle policy, Terraform examples, automation script, and tier descriptions to transition to Standard-IA after 30 days, matching S3 Standard-IA minimum storage duration constraints.
- The cold AWS tier used S3 Glacier Instant Retrieval while describing minutes-to-hours access. Changed the AWS cold mapping to S3 Glacier Flexible Retrieval, updated the storage class values from `GLACIER_IR` to `GLACIER`, and adjusted the example cold storage price used in calculators.
- The Google Cloud Storage lifecycle example was labeled YAML and applied with `gsutil lifecycle set`, but gsutil lifecycle files are JSON. Converted the snippet to JSON and updated the filename to `gcs-lifecycle.json`.
- The Azure lifecycle prefix filter used `backups/`, but Azure lifecycle `prefixMatch` values must start with the container name. Updated it to `my-backup-container/backups/`.
- The RTO calculator returned the first tier that met the RTO, which favored more expensive tiers. Updated it to evaluate from lowest-cost tier upward, renamed the throughput field to `retrieval_gb_per_second`, and corrected the documented output.
- The cost calculator accepted `retention_days` but did not use it. Updated the tier day calculations to use `retention_days`, corrected the cold price, and updated the sample output.
- The Kubernetes CronJob depended on `jq` and used a high-level same-source `aws s3 cp` for retiering. Replaced that path with an AWS CLI `s3api copy-object` example and an AWS CLI query so the example does not require jq.
- The cost-savings diagram still used the old cold-tier price. Updated the cold-tier annual cost, total, and savings percentage.

## Review Notes
Prices remain illustrative and region-dependent. AWS CLI, gsutil, Terraform, and shellcheck were not installed in the workspace, so native CLI/Terraform validation was not run locally; JSON, YAML, and Python snippets were parsed locally, and the standalone Python calculators were executed successfully.
