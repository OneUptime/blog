# Validation Summary: How to Configure Snowflake Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- Snowflake Terraform Provider (`snowflakedb/snowflake`)
- HCL configuration
- Snowflake (data warehouse)

## Sources Consulted
- Snowflake Terraform Provider GitHub repository: https://github.com/snowflakedb/terraform-provider-snowflake
- Provider configuration documentation: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/index.md
- `snowflake_database` resource documentation: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/database.md
- `snowflake_warehouse` resource documentation: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/warehouse.md
- Terraform Registry listing: https://registry.terraform.io/providers/snowflakedb/snowflake/latest

## Issues Found
The original post was titled "How to Configure Snowflake Provider with OpenTofu" but the entire body used generic placeholder text (`provider_name`, `provider-namespace/provider-name`, `provider_example_resource`, `PROVIDER_API_KEY`, `PROVIDER_API_SECRET`) instead of the actual Snowflake provider configuration. As written, the snippets would not work for Snowflake at all. The following corrections were made:

- **Provider source**: Replaced `provider_name = { source = "provider-namespace/provider-name", version = "~> 1.0" }` with the official `snowflake = { source = "snowflakedb/snowflake", version = "~> 2.0" }` (the provider was transferred from `Snowflake-Labs` to the official `snowflakedb` namespace; latest 2.x line as of v2.15.0).
- **Authentication environment variables**: Replaced the fictional `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` with the real Snowflake provider env vars (`SNOWFLAKE_ORGANIZATION_NAME`, `SNOWFLAKE_ACCOUNT_NAME`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`).
- **Provider block**: Changed `provider "provider_name"` to `provider "snowflake"` and added a real argument (`role = "ACCOUNTADMIN"`) plus a note recommending key-pair (`SNOWFLAKE_JWT`) auth for production, which is the documented preferred method.
- **Example resource**: Replaced the fictional `provider_example_resource` (which used a `tags` map that the Snowflake provider does not accept on databases) with the real `snowflake_database` resource using its required `name` argument and the supported `comment` argument. The name is also uppercased since Snowflake identifiers are case-insensitive and conventionally uppercase.
- **Output**: Updated the output to reference the corrected resource (`snowflake_database.main.name`).

## Review Notes
- The Snowflake provider was originally published under the `Snowflake-Labs/snowflake` namespace and was transferred to the official `snowflakedb/snowflake` namespace; new configurations should use `snowflakedb/snowflake`. Existing users on `Snowflake-Labs/snowflake` should follow the provider's migration guide.
- Stable resources are guaranteed only from provider v2.0.0 onward; pinning to `~> 2.0` is appropriate.
- The post is intentionally a minimal getting-started example. A future revision could expand on key-pair authentication setup (PKCS#8 private key generation, `ALTER USER ... SET RSA_PUBLIC_KEY`), warehouse sizing, and role-based separation (`snowflake_role`, `snowflake_grant_*`), but these are out of scope for the current narrow guide.
- The "secrets manager-never" hyphen on the Best Practices bullet reads as a typo for an em-dash but is not a technical error, so it was left unchanged per the review guidelines.
