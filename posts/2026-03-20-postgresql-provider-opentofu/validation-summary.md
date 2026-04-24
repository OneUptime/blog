# Validation Summary: How to Configure the PostgreSQL Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- PostgreSQL
- HCL
- OpenTofu CLI

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `validate` documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- PostgreSQL provider registry page: https://registry.terraform.io/providers/cyrilgdn/postgresql
- PostgreSQL provider documentation source: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-postgresql/main/website/docs/index.html.markdown
- PostgreSQL `postgresql_database` resource documentation source: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-postgresql/main/website/docs/r/postgresql_database.html.markdown
- PostgreSQL `postgresql_role` resource documentation source: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-postgresql/main/website/docs/r/postgresql_role.html.markdown
- PostgreSQL `postgresql_schema` resource documentation source: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-postgresql/main/website/docs/r/postgresql_schema.html.markdown
- PostgreSQL `postgresql_grant` resource documentation source: https://raw.githubusercontent.com/cyrilgdn/terraform-provider-postgresql/main/website/docs/r/postgresql_grant.html.markdown

## Issues Found
- The original post used a placeholder `hashicorp/example` provider and `example_*` resources that are unrelated to PostgreSQL. I replaced them with the real `cyrilgdn/postgresql` provider and valid `postgresql_role`, `postgresql_database`, `postgresql_schema`, and `postgresql_grant` resources.
- The original authentication section used fictitious `PROVIDER_*` environment variables and unrelated variable names. I replaced them with OpenTofu input variables and matching `TF_VAR_*` examples that work with the provider configuration shown in the post.
- The original advanced configuration covered alerts and backup policies that do not exist in the PostgreSQL provider. I replaced that section with schema creation and permission grants that are actually supported by the provider.
- The original troubleshooting guidance mentioned API rate limiting, which is not a typical or documented concern for this provider. I replaced it with permission and connection issues that match actual PostgreSQL provider behavior.
- The original conclusion referred generically to managing a service and omitted an important security caveat. I corrected it to describe PostgreSQL objects specifically and noted that role passwords are stored in state when using `postgresql_role.password`.

## Review Notes
- The post now targets the current `cyrilgdn/postgresql` provider line and uses a version constraint of `~> 1.26.0`, which matched the latest published provider version I verified on April 24, 2026.
- `postgresql_role.password` is still valid, but it stores the password in state. If this post is later updated for a newer OpenTofu baseline, it may be worth covering the provider's write-only password attributes separately.
