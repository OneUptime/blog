# Validation Summary: How to Deploy Snowflake Resources with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- Snowflake Terraform provider
- Snowflake databases and schemas
- Snowflake virtual warehouses
- Snowflake account roles, grants, and RBAC
- Snowflake service users and key-pair authentication

## Sources Consulted
- Snowflake Terraform provider overview: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/index.md
- Snowflake Terraform provider `snowflake_database`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/database.md
- Snowflake Terraform provider `snowflake_schema`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/schema.md
- Snowflake Terraform provider `snowflake_warehouse`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/warehouse.md
- Snowflake Terraform provider `snowflake_account_role`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/account_role.md
- Snowflake Terraform provider `snowflake_grant_privileges_to_account_role`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/grant_privileges_to_account_role.md
- Snowflake Terraform provider `snowflake_grant_account_role`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/grant_account_role.md
- Snowflake Terraform provider `snowflake_service_user`: https://github.com/snowflakedb/terraform-provider-snowflake/blob/main/docs/resources/service_user.md
- Snowflake Terraform provider guide: https://docs.snowflake.com/en/user-guide/terraform
- Snowflake Time Travel documentation: https://docs.snowflake.com/en/user-guide/data-time-travel
- Snowflake multi-cluster warehouse documentation: https://docs.snowflake.com/en/user-guide/warehouses-multicluster
- Snowflake access control overview: https://docs.snowflake.com/en/user-guide/security-access-control-overview
- Snowflake `GRANT <privileges> ... TO ROLE` documentation: https://docs.snowflake.com/en/sql-reference/sql/grant-privilege
- Snowflake `CREATE USER` documentation and user types: https://docs.snowflake.com/en/sql-reference/sql/create-user

## Issues Found
1. **Outdated provider namespace and version**: The post used `Snowflake-Labs/snowflake` with `~> 0.87`. The official provider namespace is now `snowflakedb/snowflake`, and stable support starts with v2. Updated the provider source to `snowflakedb/snowflake`, version `~> 2.15`, and the provider fields to current `organization_name`, `account_name`, and `user`.
2. **Incorrect grant resource and block types**: The post used `snowflake_grant_privileges_to_role` and placed database and warehouse grants under `on_schema_object`. Current provider docs use `snowflake_grant_privileges_to_account_role`; databases and warehouses must be granted with `on_account_object`. Updated the grant resources and block shapes.
3. **Missing schema usage grant**: The analyst role was granted database `USAGE` and table `SELECT`, but Snowflake also requires `USAGE` on the schema to query objects in that schema. Added an analytics schema `USAGE` grant.
4. **Deprecated role resources**: The post used older account role patterns (`snowflake_role` and `snowflake_role_grants`). Updated to `snowflake_account_role` and `snowflake_grant_account_role`.
5. **ETL role was referenced but not created**: The user snippet set `default_role = "ETL_ROLE"` and granted that role, but no Terraform-managed ETL role existed. Added an `ETL_ROLE` account role and granted it warehouse `USAGE`.
6. **Service account modeled as a password user**: A current Snowflake service user should use `snowflake_service_user` with key-pair authentication rather than a password-backed person user. Replaced `snowflake_user` with `snowflake_service_user` and `rsa_public_key`.
7. **Incorrect future grant guidance**: The post said OpenTofu models future table grants with `on_future_schemas_in_database`, which is not the correct provider shape. Updated the text to refer to the `future` block inside `on_schema_object`.
8. **Edition-specific Snowflake features lacked caveats**: Seven-day Time Travel retention and multi-cluster warehouses require Snowflake Enterprise Edition or higher. Added inline caveats and adjusted warehouse comments so the examples are not presented as universally available on all editions.

## Review Notes
- The post now uses `ACCOUNTADMIN` only to keep the compact tutorial snippets capable of managing databases, warehouses, users, roles, and grants with one provider configuration. The best-practices section now notes that production should use least-privilege automation roles or provider aliases.
- Local `tofu`/`terraform` binaries were not available in the workspace, so no local `tofu validate` run was performed. The review was completed against official Snowflake documentation and the official provider documentation.
