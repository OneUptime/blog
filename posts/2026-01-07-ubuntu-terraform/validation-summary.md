# Validation Summary: How to Install and Use Terraform on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide — step-by-step installation and hands-on introduction to Terraform on Ubuntu.

## Technologies Covered
- Terraform (HashiCorp IaC tool)
- Ubuntu (20.04 / 22.04 / 24.04 LTS)
- HCL (HashiCorp Configuration Language)
- HashiCorp `local` provider (`local_file` resource)
- APT package management / GPG keyring repository setup
- Snap package manager
- AWS S3 + DynamoDB remote state backend
- Terraform Registry & Git module sources

## Sources Consulted
- Official Terraform install docs (HashiCorp APT repo): https://developer.hashicorp.com/terraform/install
- Terraform CLI commands reference: https://developer.hashicorp.com/terraform/cli/commands
- `local` provider docs (`local_file`): https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file
- Terraform language / functions (`jsonencode`, `yamlencode`, `formatdate`, `timestamp`, splat, `for`): https://developer.hashicorp.com/terraform/language/functions
- S3 backend docs: https://developer.hashicorp.com/terraform/language/settings/backends/s3
- CLI config file / plugin cache: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform releases (binary download URL format & 1.7.0 release): https://releases.hashicorp.com/terraform/

## Issues Found
No technical issues found.

All installation methods (HashiCorp APT repository with the `/usr/share/keyrings/hashicorp-archive-keyring.gpg` keyring and `signed-by` repo line, manual binary download from `releases.hashicorp.com`, and `snap install terraform --classic`) match the official documented procedures. The HCL examples are syntactically valid and use current, non-deprecated constructs: `required_providers`, `local_file` (including `file_permission` and the `.id`/`.filename` attributes), `count`, conditional expressions, splat expressions, `validation` blocks, typed variables (object/map/list), `for` expressions, and the `jsonencode`/`yamlencode`/`formatdate`/`timestamp`/`merge`/`contains`/`length` functions. The `init`/`plan`/`apply`/`destroy`/`fmt`/`validate`/`state`/`workspace`/`output` commands and their flags are accurate, as are the S3 backend (with `dynamodb_table` locking) and CLI config / plugin-cache examples.

## Review Notes
- **`terraform refresh` deprecation:** The troubleshooting section shows `terraform refresh` and then offers `terraform plan -refresh-only` as an alternative. `terraform refresh` has been deprecated since v0.15.4 in favor of `-refresh-only`; it still works, and the post already presents the recommended alternative, so no change was required. Could be flagged explicitly in a future revision.
- **S3 native locking:** `dynamodb_table` is correct and fully supported for the Terraform 1.7 era referenced in the post. Newer Terraform/AWS provider versions also offer S3-native state locking via `use_lockfile = true`; worth mentioning if the post is later updated to a newer version.
- **`timestamp()` and perpetual drift:** Using `timestamp()` inside `local_file` content (the `config_file` and module `metadata` resources) is valid HCL but produces a new value on every run, which can cause Terraform to show the resource as changed on subsequent applies. This is a behavioral nuance, not an error, and is acceptable for a demonstration.
- **`local_file` import:** The `terraform import local_file.imported ...` example illustrates correct command syntax, though the `local` provider's `local_file` has historically had limited import support. As a generic illustration of the `import` command it is fine.
- **Minor formatting (non-technical):** Two subheadings — "Resources" (under Core Concepts) and "Resource Naming" (under Best Practices) — are written as plain paragraph text rather than `###` Markdown headings. This is a cosmetic rendering issue, not a technical inaccuracy, so it was left unchanged per the technical-only review scope.
