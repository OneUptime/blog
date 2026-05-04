# Validation Summary: How to Configure Mysql Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HCL (HashiCorp Configuration Language)
- MySQL
- petoju/mysql Terraform provider

## Sources Consulted
- petoju/mysql provider on the Terraform Registry: https://registry.terraform.io/providers/petoju/mysql/latest/docs
- petoju/terraform-provider-mysql GitHub repository: https://github.com/petoju/terraform-provider-mysql
- mysql_database resource documentation: https://registry.terraform.io/providers/petoju/mysql/latest/docs/resources/database
- OpenTofu documentation on `required_providers`: https://opentofu.org/docs/language/providers/requirements/

## Issues Found
The post originally contained generic placeholder content (e.g., `provider_name`, `provider-namespace/provider-name`, `PROVIDER_API_KEY`, `provider_example_resource`) instead of MySQL-specific configuration. Since the post's title and introduction explicitly promise guidance on configuring the MySQL provider, this was a technical inaccuracy. Specific fixes:

1. **Provider Installation block** — Replaced the placeholder source `provider-namespace/provider-name` with the canonical MySQL provider source `petoju/mysql` (the maintained successor to the archived `hashicorp/mysql`), and bumped the version constraint from `~> 1.0` to `~> 3.0` to reflect the current major version (3.x as of 2026).
2. **Authentication block** — Replaced `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the actual environment variables consumed by petoju/mysql: `MYSQL_ENDPOINT`, `MYSQL_USERNAME`, and `MYSQL_PASSWORD`. Updated the `provider "provider_name"` block to `provider "mysql"` with appropriate inline-credential commentary.
3. **Example Resource block** — Replaced the fictitious `provider_example_resource` with `mysql_database`, which is the canonical resource for the MySQL provider. Removed the `tags = {...}` block because MySQL resources do not support cloud-style tags. Substituted the hyphen separator with an underscore in the database name, since hyphens require backtick-quoting in MySQL identifiers and are not idiomatic. Added the documented optional arguments `default_character_set` and `default_collation` with sane defaults (`utf8mb4` / `utf8mb4_unicode_ci`).
4. **Outputs block** — Updated the resource reference from `provider_example_resource.main.id` to `mysql_database.main.id` to match the corrected example.
5. **Best Practices** — Changed "Store API keys" to "Store database credentials" since MySQL uses username/password, not API keys.

## Review Notes
- The petoju/mysql provider supports many additional auth modes (AWS IAM/RDS via `aws_config`, Azure AD via `azure_config`, TLS via `tls`/`custom_tls`, CloudSQL `private_ip`). This guide intentionally covers only the basic username/password flow, which is appropriate for an introductory post.
- The `provider "mysql"` configuration in the post does not specify `endpoint`/`username`/`password` arguments inline. petoju/mysql does read these from `MYSQL_ENDPOINT` / `MYSQL_USERNAME` / `MYSQL_PASSWORD`, so the configuration as written is valid; readers should be aware these env vars must be set before `tofu plan` / `tofu apply`.
- The post's structure is intentionally generic ("Provider Installation", "Authentication", "Example Resource") — likely templated across a series of OpenTofu provider posts. After fixes, the content is technically correct and MySQL-specific where it counts.
- No other technical issues found in the surrounding prose, best practices, or output blocks.
