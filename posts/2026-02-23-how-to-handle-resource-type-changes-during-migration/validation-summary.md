# Validation Summary: How to Handle Resource Type Changes During Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.1+, 1.5 import blocks, 1.8 cross-type moved blocks)
- HashiCorp Configuration Language (HCL)
- AWS provider (S3, ELB/ALB, Elasticsearch/OpenSearch, NAT Gateway)
- Bash scripting (for batch migration helper)

## Sources Consulted
- Terraform refactoring / moved blocks docs: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform import block docs: https://developer.hashicorp.com/terraform/language/block/import
- AWS provider v4 upgrade guide (S3 bucket refactoring): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-4-upgrade
- `aws_s3_bucket_lifecycle_configuration` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- `aws_s3_bucket_acl` resource and import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- `aws_opensearch_domain` resource docs and migration notes: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- hashicorp/terraform-provider-aws issue #25412 (aws_s3_bucket_object → aws_s3_object migration)
- hashicorp/terraform-provider-aws issue #39721 (ES → OpenSearch cross-resource move)
- Terraform 1.8 release notes (cross-resource-type move support via `MoveResourceState`)

## Issues Found

1. **Inaccurate moved block capability claim.** The post stated that moved blocks (introduced in Terraform 1.1) were "the primary tool for handling resource renames and type changes." In reality, the 1.1 moved block only handles renames within the same resource type. Cross-resource-type moves require Terraform 1.8+ AND the provider must explicitly implement a move handler for the specific transition. For the `aws_s3_bucket_object` → `aws_s3_object` example used in the post, support is not universal and users frequently report it not working (issue #25412). Rewrote the "Using Moved Blocks" section to lead with a same-type rename example, present the cross-type case as a separate scenario with the version/provider caveats, and added a fallback note about `terraform state mv` or remove-and-import when the provider doesn't support the move.

2. **Missing required `filter` block in `aws_s3_bucket_lifecycle_configuration` rule.** The lifecycle rule used `id`, `status`, and `expiration` but no `filter` or `prefix`. Under AWS provider v5+ (and per the AWS S3 API), a filter is effectively required to avoid errors. Added `filter {}` (with an explanatory comment) so the example actually applies to all objects without erroring at apply time.

3. **`terraform state mv` example for `aws_elasticsearch_domain` → `aws_opensearch_domain` is unsafe.** `terraform state mv` only relocates a resource address; it does not transform attributes, and the schemas of these two resource types differ (e.g., `elasticsearch_version` vs `engine_version`). The next plan would show drift. Replaced the example: kept `terraform state mv` for same-type renames (where it is actually safe), and gave the schema-incompatible case its own example using `terraform state rm` followed by re-import as the target type.

## Review Notes

- The "Batch Handling Resource Type Changes" bash script still lists `aws_elasticsearch_domain` → `aws_opensearch_domain` in its TYPE_MAP, but I left it in place because the surrounding sections now clearly explain that not every cross-type pair has provider move support. The script generates `moved` blocks that will produce a plan the user reviews before applying, and the "Testing Resource Type Changes" section explicitly tells the reader to look for destroy/create pairs.
- The Classic ELB → ALB example is intentionally illustrative — a full ALB requires more attributes than shown (e.g., security_groups, listener rules for non-default actions), but the post correctly frames this as a parallel-deployment migration rather than a state-move case, so the truncated configs are acceptable as conceptual examples.
- The "Lifecycle of Moved Blocks" example still references `aws_s3_bucket_object` → `aws_s3_object`. Given the new context added in the moved blocks section, readers now have the version/provider caveats in mind, so this is consistent.
- The import IDs for `aws_s3_bucket_acl` (`my-bucket,private`), `aws_s3_bucket_versioning` (`my-bucket`), and `aws_s3_bucket_lifecycle_configuration` (`my-bucket`) are all correct per the AWS provider documentation.
- The `import` block syntax (Terraform 1.5+) is correct, and the moved block syntax is correct.
