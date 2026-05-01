# Validation Summary: How to Document OpenTofu Infrastructure for Team Knowledge Sharing

## Status
validated

## Post Type
Guide / Best practices

## Technologies Covered
- OpenTofu
- `terraform-docs`
- `pre-commit-terraform`
- HCL
- AWS RDS
- Amazon S3 and DynamoDB backends for OpenTofu state
- `mise`

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `tofu test` command documentation: https://opentofu.org/docs/cli/commands/test/
- terraform-docs configuration reference: https://terraform-docs.io/user-guide/configuration/
- terraform-docs output configuration: https://terraform-docs.io/user-guide/configuration/output/
- terraform-docs sections configuration: https://terraform-docs.io/user-guide/configuration/sections/
- terraform-docs sort configuration: https://terraform-docs.io/user-guide/configuration/sort/
- terraform-docs output file injection example: https://terraform-docs.io/how-to/insert-output-to-file/
- pre-commit-terraform hook documentation: https://github.com/antonbabenko/pre-commit-terraform
- pre-commit-terraform releases: https://github.com/antonbabenko/pre-commit-terraform/releases
- AWS provider `aws_db_instance` resource documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Amazon RDS backup retention documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
- Amazon RDS backup and snapshot behavior documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- Amazon RDS DB instance deletion documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html
- Amazon RDS pricing: https://aws.amazon.com/rds/pricing/
- mise `install` command documentation: https://mise.jdx.dev/cli/install.html

## Issues Found
- The `pre-commit-terraform` example pinned `v1.86.0` but relied on `terraform-docs` standard `<!-- BEGIN_TF_DOCS -->` / `<!-- END_TF_DOCS -->` markers. In pre-commit-terraform, standard markers are only the default starting in `v1.93`, so the hook could miss those markers as written. Added `--hook-config=--use-standard-markers=true` to make the snippet correct for the pinned version.
- The `aws_db_instance` example set `skip_final_snapshot = false` for production but omitted `final_snapshot_identifier`, which the AWS provider documentation requires when final snapshots are enabled. Added `final_snapshot_identifier`.
- The inline RDS comment hard-coded snapshot cost as `~$0.023/GB/month`. Amazon RDS backup and snapshot charges vary by region, storage usage, and free allocation, so that fixed number was too specific to present as general guidance. Replaced it with a comment to check current RDS pricing for the relevant engine and region.
- The `CONTRIBUTING.md` template said to write tests in `test/` using `tofu test`. OpenTofu's `tofu test` command defaults to `tests/`, while Go-based Terratest suites commonly live in `test/`. Updated the line to distinguish `tests/` for `tofu test` and `test/` for Terratest.

## Review Notes
- OpenTofu's current S3 backend documentation says native S3 locking with `use_lockfile = true` is the preferred locking mechanism, but DynamoDB locking remains fully supported. The ADR example using S3 plus DynamoDB is therefore still technically valid.
- The pinned `pre-commit-terraform` version `v1.86.0` is older than the latest release shown on the project's releases page as of `2026-05-01` (`v1.105.0`, released on `January 6, 2026`), but the snippet remains correct after the marker compatibility fix.
- The local `terraform-docs` and `tofu` CLIs were not installed in the review environment, so command behavior was validated against the current official documentation rather than local `--help` output.
