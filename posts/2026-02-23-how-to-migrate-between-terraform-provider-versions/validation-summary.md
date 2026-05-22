# Validation Summary: How to Migrate Between Terraform Provider Versions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider version constraints
- Terraform dependency lock file
- Terraform state commands and moved blocks
- HashiCorp AWS provider
- AWS S3 backend state recovery
- Dependabot Terraform updates

## Sources Consulted
- Terraform version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform providers command: https://developer.hashicorp.com/terraform/cli/commands/providers
- Terraform providers lock command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Terraform init command: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform dependency lock file: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform moved block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform state replace-provider command: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- Terraform version command: https://docs.hashicorp.com/terraform/cli/commands/version
- AWS provider v5 upgrade guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade
- AWS provider v4 upgrade guide / S3 bucket refactor: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-4-upgrade
- AWS provider S3 bucket ACL resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl
- AWS CLI s3api list-object-versions: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html

## Issues Found
- The pessimistic constraint explanation said `~> 5.0` allows `5.0.x through 5.x.x` under a note about patch updates. I clarified that the `~>` operator allows updates up to the next major or minor boundary depending on precision, and that `~> 5.0` allows 5.x but not 6.x.
- The post described `terraform providers lock -help` as a way to view available provider versions. That command shows help for the lock command, not registry version listings. I changed the wording to say it reviews lock command options and directs readers to the registry for available versions and upgrade guides.
- The S3 migration example attributed the S3 bucket resource split to AWS provider v5. The S3 bucket refactor and related deprecations were introduced in AWS provider v4, with users commonly carrying those changes through v4/v5 upgrades. I corrected the wording.
- The S3 migration example removed `acl = "private"` without showing the standalone ACL resource. I added `aws_s3_bucket_ownership_controls` and `aws_s3_bucket_acl` using the current AWS provider pattern for managing an ACL explicitly.
- The `terraform state replace-provider` example replaced `registry.terraform.io/hashicorp/aws` with itself, which would not demonstrate a provider source migration. I changed the source example to the legacy `registry.terraform.io/-/aws` address migrating to `registry.terraform.io/hashicorp/aws`.
- The moved-block example used `aws_s3_bucket_object` to `aws_s3_object`, implying moved blocks are the general answer for provider resource type migrations. I changed the example to a same-type resource address rename and added a note that provider resource type migrations should follow provider-specific import or state migration guidance.

## Review Notes
Terraform CLI was not installed in the local workspace, so CLI syntax was verified against official HashiCorp documentation rather than local `--help` output. The post is technically relevant and remains a valid guide after the corrections above.
