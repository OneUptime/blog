# Validation Summary: How to Create S3 Buckets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS S3 (buckets, public access block, versioning, encryption, lifecycle, CORS, replication)
- AWS KMS (server-side encryption keys)
- AWS IAM (policy documents, bucket policy, replication role)
- hashicorp/aws Terraform provider (v4.x / v5.x resource model)

## Sources Consulted
- Terraform AWS provider docs — `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- `aws_s3_bucket_cors_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration
- `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- `aws_s3_bucket_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS S3 security best practices (HTTPS enforcement via `aws:SecureTransport`)
- AWS Config managed rule `s3-bucket-ssl-requests-only`

## Issues Found
No technical issues found. All resource names, argument names, nested-block structures, attribute references, and the HTTPS-enforcement bucket-policy pattern match the current AWS provider documentation and AWS-published guidance.

## Review Notes
- The introduction's claim that AWS provider 4.x+ split S3 settings into separate resources is accurate — this refactor landed in provider v4.0.0.
- Lifecycle: the second rule (`cleanup-old-versions`) omits a `filter` block. This is currently valid (the rule defaults to an empty-prefix match), but the provider docs include a note recommending an explicit `filter` because the legacy rule-level `prefix` argument is deprecated. Adding `filter {}` would silence any future warning, but the code as written is not incorrect.
- SSE algorithm: post shows `aws:kms`. The provider also accepts `AES256` and the newer `aws:kms:dsse` (dual-layer KMS). Post does not claim its list is exhaustive, so this is informational only.
- Replication: `delete_marker_replication` requires V2 replication semantics, which are implicit when using the `aws_s3_bucket_replication_configuration` resource here — no action needed.
- `aws_s3_bucket.main.bucket` is used in outputs; this is the input argument re-exposed as a readable attribute. The canonical exported attribute is `id` (which equals `bucket`). Both work; no change required.
- HTTPS-enforcement statement uses `values = ["false"]` (string in a list). AWS IAM accepts this form as well as the bare boolean — the post's form is the most commonly published variant.
