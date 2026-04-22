# Validation Summary: How to Configure S3 Bucket Replication with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- Amazon S3 bucket replication
- Amazon S3 bucket versioning
- AWS IAM roles and policies

## Sources Consulted
- AWS S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- AWS S3 permissions for live replication: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Terraform AWS Provider `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS Provider `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/

## Issues Found
- The destination bucket examples used `provider = aws.us_west_2`, but the post did not show the corresponding aliased provider configuration. Added a default provider for the source region and an aliased provider for `us-west-2` so the reference resolves.
- The replication configuration only depended on source bucket versioning. AWS requires both source and destination buckets to be versioning-enabled for replication, so the `depends_on` list now includes both versioning resources.
- The replication rule omitted a filter. Current AWS provider documentation says a rule with no filter should use an empty `filter {}` block, so the rule now explicitly replicates all objects using the non-deprecated form.

## Review Notes
The OpenTofu CLI commands are valid. The IAM trust policy and replication permissions match AWS's minimum live replication policy for a same-account, unencrypted replication setup. Additional permissions are still required for cross-account replication, KMS-encrypted objects, or Object Lock-enabled buckets.
