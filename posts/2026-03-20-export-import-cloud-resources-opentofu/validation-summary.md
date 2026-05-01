# Validation Summary: How to Export and Import Existing Cloud Resources into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS CLI
- Azure CLI
- Google Cloud CLI
- AWS, Azure, and Google Cloud provider resource imports

## Sources Consulted
- OpenTofu import blocks: https://opentofu.org/docs/language/import/
- OpenTofu configuration generation: https://opentofu.org/docs/v1.9/language/import/generating-configuration/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- AWS CLI `describe-vpcs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI `list-buckets`: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html
- AWS CLI `describe-db-instances`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- Azure CLI `az resource list`: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest#az-resource-list
- Google Cloud CLI `gcloud compute instances list`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/list
- Google Cloud CLI `gcloud storage buckets list`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/list
- Google Cloud import guidance for Terraform resources, including `google_storage_bucket` ID format: https://cloud.google.com/docs/terraform/resource-management/import
- AWS provider resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AzureRM and Google provider resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
- The import-only workflow was missing provider context for configuration generation. I added a minimal `provider "aws"` block to the example because OpenTofu requires provider configuration when generating HCL from `import` blocks without existing resource configuration.
- The generated HCL example said OpenTofu populates “all attributes” from the real resource. I changed that wording to generated arguments based on the real resource, which matches OpenTofu’s documented best-effort configuration generation behavior.
- The post said to remove import blocks after a successful import. I corrected this to say they can be removed or left in place, because OpenTofu documents both options as valid.
- The `google_storage_bucket` import ID format was incorrect. I changed it from `project/location/bucket-name` to `project/bucket-name`, which matches Google Cloud’s documented import format.

## Review Notes
- OpenTofu documents configuration-driven import and `-generate-config-out` as experimental behavior.
- OpenTofu supports `for_each` on `import` blocks, but configuration generation is not currently available for `import` blocks that use `for_each`. The post’s Step 6 remains valid because it defines the resource blocks manually rather than relying on generated configuration.
