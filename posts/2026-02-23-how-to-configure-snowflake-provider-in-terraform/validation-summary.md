# Validation Summary: How to Configure Snowflake Provider in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Snowflake Terraform provider
- Snowflake warehouses, databases, schemas, roles, grants, users, stages, pipes, network policies, and resource monitors
- OpenSSL RSA key-pair authentication
- Snowflake SQL

## Sources Consulted
- Snowflake Terraform provider documentation: https://docs.snowflake.com/en/user-guide/terraform
- Snowflake key-pair authentication documentation: https://docs.snowflake.com/en/user-guide/key-pair-auth
- Snowflake Terraform provider source and generated docs: https://github.com/snowflakedb/terraform-provider-snowflake
- Terraform Registry documentation for snowflakedb/snowflake: https://registry.terraform.io/providers/snowflakedb/snowflake/latest/docs
- Terraform file and path expansion functions: https://developer.hashicorp.com/terraform/language/functions/file and https://developer.hashicorp.com/terraform/language/functions/pathexpand
- OneUptime homepage: https://oneuptime.com
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
- The provider declaration used the older `Snowflake-Labs/snowflake` namespace and `~> 0.87`. Updated it to the current `snowflakedb/snowflake` namespace and `~> 2.16`, because Snowflake officially supports provider versions 2.0.0 and later.
- The key-pair provider example omitted `authenticator = "SNOWFLAKE_JWT"`. Added it because the current provider requires the JWT authenticator for private-key authentication.
- The private key example used `file(var.snowflake_private_key_path)` with a default `~` path. Updated it to `file(pathexpand(...))` so tilde paths are expanded before reading the key file.
- The environment variable example used `SNOWFLAKE_PRIVATE_KEY_PATH`, which is not a current provider configuration field. Replaced it with `SNOWFLAKE_PRIVATE_KEY="$(cat ...)"` and added `SNOWFLAKE_AUTHENTICATOR="SNOWFLAKE_JWT"`.
- The broad examples used `SYSADMIN`, which is not sufficient for all shown account-level resources and grants. Changed the examples to `ACCOUNTADMIN` and clarified the prerequisite wording.
- The warehouse example assigned the resource monitor by `.name`. Updated it to `.fully_qualified_name`, matching current provider examples.
- The resource monitor used a fixed `start_timestamp` date that is now in the past. Replaced it with `IMMEDIATELY`.
- The schema example used `is_managed`, which is not the current argument. Replaced it with `with_managed_access = "true"`.
- The user example used a boolean for `must_change_password`, while the current provider models that field as a string-like boolean. Changed it to `"true"`.
- The stage example used deprecated `snowflake_stage` syntax with string `credentials` and `file_format`. Replaced it with `snowflake_stage_external_s3`, nested `credentials`, and nested JSON `file_format` blocks.
- The pipe example referenced the old `snowflake_stage.s3_raw` resource name after the stage resource change. Updated the reference to `snowflake_stage_external_s3.s3_raw`.
- The stage and pipe examples rely on provider preview resources. Added the required `preview_features_enabled` entries to the provider example.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The examples were checked against the official Snowflake provider documentation and Snowflake documentation. The S3 stage and pipe resources are still provider preview features, so future provider releases may require additional migration work.
