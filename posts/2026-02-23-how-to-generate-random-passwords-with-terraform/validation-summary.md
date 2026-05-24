# Validation Summary: How to Generate Random Passwords with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Random Provider (~> 3.6) — `random_password` resource
- HashiCorp AWS Provider (~> 5.0)
- AWS Secrets Manager (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`)
- AWS RDS (`aws_db_instance`) — PostgreSQL engine
- Terraform S3 backend with DynamoDB locking

## Sources Consulted
- HashiCorp Random Provider docs — `random_password` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- HashiCorp AWS Provider docs — `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- HashiCorp AWS Provider docs — `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- HashiCorp AWS Provider docs — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3
- Random provider v3.4.0 changelog (introducing `numeric` as replacement for deprecated `number` attribute)

## Issues Found
No technical issues found.

All `random_password` attributes used (`length`, `special`, `upper`, `lower`, `numeric`, `min_upper`, `min_lower`, `min_numeric`, `min_special`, `override_special`, `keepers`, `result`) are valid for the pinned provider version `~> 3.6`. The post correctly uses `numeric` (not the deprecated `number` alias).

The `keepers` mechanism is correctly described — changing a keeper value forces resource replacement, which generates a new password. The S3 backend block uses valid arguments (`bucket`, `key`, `region`, `encrypt`, `dynamodb_table`). The RDS instance arguments (`identifier`, `engine`, `engine_version`, `instance_class`, `allocated_storage`, `db_name`, `username`, `password`, `skip_final_snapshot`, `tags`) are all valid. The Secrets Manager resources and `jsonencode` usage are correct.

The claim that `random_password.result` is sensitive by default is accurate per the provider docs.

## Review Notes
- `engine_version = "15.4"` for RDS PostgreSQL was valid at release but AWS regularly deprecates minor versions; readers using this in production should check `aws rds describe-db-engine-versions` for currently supported versions.
- The S3 backend's `dynamodb_table` argument still works but HashiCorp now recommends the newer S3-native locking (`use_lockfile = true`) in Terraform 1.10+. This is not an error in the post (the `~> 3.6` random + AWS `~> 5.0` setup is compatible with either pattern), but a future revision could mention the modern alternative.
- The advice that `@` and `'` are "problematic" SQL characters is a reasonable defensive choice — `@` has special meaning in URI-style connection strings (`postgres://user:pass@host`) and `'` can complicate string-literal handling in some tools. Not technically required for PostgreSQL itself.
- The `db.r6g.large` instance class is Graviton-based and is available in most AWS regions for PostgreSQL.
- The `bcrypt_hash` attribute (also available on `random_password`) is not covered; not an error, but worth noting for users who need to store hashes rather than plaintext.
