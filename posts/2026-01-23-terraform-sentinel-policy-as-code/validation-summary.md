# Validation Summary: How to Implement Policy as Code with Sentinel

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HCP Terraform
- Terraform Enterprise
- HashiCorp Sentinel
- Sentinel policy language
- Sentinel CLI testing
- Terraform Sentinel imports: `tfplan/v2` and `tfconfig/v2`
- Terraform AWS provider resources for EC2, S3, RDS, Redshift, OpenSearch, and EMR

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp `tfconfig/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfconfig-v2
- HashiCorp guide to generating and using Sentinel mock data: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/test-sentinel
- HashiCorp HCP Terraform policy quickstart: https://developer.hashicorp.com/terraform/tutorials/policy/policy-quickstart
- HashiCorp HCP Terraform Sentinel policy set VCS documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- HashiCorp HCP Terraform policy enforcement levels documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets
- Terraform AWS provider `aws_elasticsearch_domain` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticsearch_domain
- Terraform AWS provider S3 encryption configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider S3 public access block documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform AWS provider RDS instance documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The introduction and setup section used the older "Terraform Cloud" name. Updated this to "HCP Terraform" while keeping Terraform Enterprise where applicable.
- The introductory Sentinel example used `implies`, which is not a Sentinel operator. Rewrote the expression with supported boolean operators.
- The policy-set tree placed local policy files under a `policies/` subdirectory. Updated the structure and `source` paths so the local policy files sit beside `sentinel.hcl`, matching HCP Terraform policy set documentation.
- The hard-mandatory enforcement description said it cannot be overridden. Updated it to note that hard-mandatory policies block applies unless the policy set is configured to allow overrides.
- The S3 encryption policy did not filter out delete-only encryption configuration changes and used substring matching for bucket names. Updated it to ignore delete-only changes and require exact bucket matching.
- The expensive resource list used `aws_elasticsearch_domain`, which is deprecated in the current AWS provider documentation. Replaced it with `aws_opensearch_domain`.
- The public S3 policy only validated public access block resources if they were present, so a bucket without a matching block could still pass. Updated the policy to require each planned S3 bucket to have a matching public access block with all four block settings enabled.
- The public S3 policy did not filter delete-only public access block changes. Added the delete-only filter.
- The `tfconfig/v2` variable example checked the collection key rather than the variable's `name` field. Updated it to inspect `v.name`, which matches the import reference.
- The best-practices error-message snippet used an invalid `rule when ... else` form. Rewrote it as a helper function called by `main`.

## Review Notes
The policies are still simplified tutorial examples. In production, S3 public-access validation should also consider bucket policies, account-level public access blocks, and values that may be unknown during planning.
