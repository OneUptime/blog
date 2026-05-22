# Validation Summary: How to Use CDKTF Remote Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform remote backends and state locking
- AWS S3 backend
- Azure Blob Storage / azurerm backend
- Google Cloud Storage / gcs backend
- HCP Terraform cloud backend
- AWS CLI, Azure CLI, and Google Cloud CLI

## Sources Consulted
- HashiCorp CDKTF Remote Backends documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/remote-backends
- HashiCorp CDKTF Project Setup documentation: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/project-setup
- HashiCorp CDKTF TypeScript API reference for backend classes and structs: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes and https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/structs
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform backend overview: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- AWS CLI `s3api create-bucket` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- Microsoft Azure CLI `az group create`, `az storage account create`, and `az storage container create` references: https://learn.microsoft.com/en-us/cli/azure/group, https://learn.microsoft.com/en-us/cli/azure/storage/account, and https://learn.microsoft.com/en-us/cli/azure/storage/container
- Google Cloud CLI `gcloud storage buckets create` and `gcloud storage buckets update` references: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/create and https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Google Cloud Object Versioning documentation: https://docs.cloud.google.com/storage/docs/using-object-versioning
- Published `cdktf@0.21.0` package TypeScript declarations and synthesized output checks for `S3Backend`, `CloudBackend`, `AzurermBackend`, and `GcsBackend`.

## Issues Found
- The introduction incorrectly implied that CDKTF always starts with local state by default. HashiCorp's current CDKTF docs say `cdktf init` defaults to HCP Terraform unless `--local` is used, so I clarified the difference between Terraform's local backend default and CDKTF project initialization.
- The post did not mention that CDKTF is deprecated. HashiCorp deprecated CDKTF on December 10, 2025, so I added a short note while keeping the tutorial usable for CDKTF 0.21.x users.
- The local backend section said state is stored in `cdktf.out`. CDKTF writes synthesized Terraform configuration under `cdktf.out`; the local backend stores state on the local filesystem. I corrected the wording.
- The S3 section presented DynamoDB locking as the current standard. Terraform now documents DynamoDB-based S3 backend locking as deprecated and recommends S3 lockfile locking with `use_lockfile`, so I removed the DynamoDB table creation command and changed S3 examples to synthesize `use_lockfile` via CDKTF `addOverride`.
- The S3 assume-role example used the deprecated top-level `roleArn` field. I changed it to the current `assumeRole: { roleArn: ... }` shape and verified that CDKTF synthesizes the expected `assume_role` backend block.
- The Azure backend example relied on older access key lookup behavior. Current Terraform documentation recommends Microsoft Entra ID authentication for new azurerm backend workloads, so I added `useAzureadAuth: true`, synthesized `use_cli` with a CDKTF override, and changed the container creation command to use Azure CLI login authentication.
- The GCS setup commands used `gsutil`, which Google now documents as a legacy Cloud Storage CLI. I updated the bucket creation and versioning commands to use `gcloud storage buckets create` and `gcloud storage buckets update --versioning`.
- The migration section only showed raw `terraform init -migrate-state`. That remains appropriate for backend migration in the synthesized stack directory, but CDKTF also documents `cdktf diff <stack-name> --migrate-state` for HCP Terraform, so I added that caveat.

## Review Notes
- The local environment did not have Terraform, AWS CLI, Azure CLI, or Google Cloud CLI installed, so CLI verification was performed against official command references instead of local `--help` output.
- CDKTF 0.21.0's typed `S3BackendConfig` does not expose `useLockfile`, and its `AzurermBackendConfig` does not expose `useCli`, but CDKTF escape hatches synthesize those backend fields correctly. I verified the generated S3 and Azure backend `cdk.tf.json` in a temporary CDKTF project.
