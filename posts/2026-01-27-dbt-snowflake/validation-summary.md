# Validation Summary: How to Use dbt with Snowflake

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- dbt Core
- dbt Snowflake adapter
- Snowflake
- SQL
- YAML
- GitHub Actions

## Sources Consulted
- dbt Developer Hub: Snowflake configurations - https://docs.getdbt.com/reference/resource-configs/snowflake-configs
- dbt Developer Hub: Snowflake setup - https://docs.getdbt.com/docs/local/connect-data-platform/snowflake-setup
- dbt Developer Hub: dbt_project.yml reference - https://docs.getdbt.com/reference/dbt_project.yml
- dbt Developer Hub: Node selector methods / state selection - https://docs.getdbt.com/reference/node-selection/methods
- Snowflake Documentation: Clustering Keys & Clustered Tables - https://docs.snowflake.com/en/user-guide/tables-clustering-keys
- Snowflake Documentation: Automatic Clustering - https://docs.snowflake.com/en/user-guide/tables-auto-reclustering
- Snowflake Documentation: Storage costs for Time Travel and Fail-safe - https://docs.snowflake.com/en/user-guide/data-cdp-storage-costs
- Snowflake Documentation: Understanding storage cost - https://docs.snowflake.com/en/user-guide/cost-understanding-data-storage
- Snowflake Documentation: Cloning considerations - https://docs.snowflake.com/en/user-guide/object-clone
- Snowflake Documentation: CREATE SCHEMA - https://docs.snowflake.com/en/sql-reference/sql/create-schema

## Issues Found
- The production profile used a fixed `schema: MARTS`, while the CI clone example created a separate clone schema that dbt would not target. Changed the profile to use `DBT_SCHEMA` with `MARTS` as the default, and set `DBT_SCHEMA` in the CI clone/build steps.
- The `dbt_project.yml` example omitted `config-version: 2` and `profile`, making it less accurate as a project file example. Added both fields.
- The clustering section described clustering as "maintenance-free" after definition. Snowflake manages reclustering automatically, but automatic clustering consumes credits and should be monitored. Updated the wording.
- The clustering recommendation suggested high-cardinality join columns without caveat. Snowflake recommends frequently used filter/join columns, while very high-cardinality unique columns are often poor direct clustering keys. Updated the table.
- The transient table section claimed storage savings "up to 50%." Snowflake documents the behavior in terms of no Fail-safe and at most one day of Time Travel/Fail-safe storage charges for transient and temporary tables, not a universal percentage. Reworded the claim.
- The GitHub Actions example used `dbt build --select state:modified+` without supplying a comparison manifest through `--state` or an equivalent environment variable. Changed the example to run `dbt build`; kept the later best-practice note but added the required `--state <prod-artifacts>` flag.
- The query history example labeled `credits_used_cloud_services` as general compute credits. Snowflake's column tracks cloud services credits, not warehouse compute attribution per query. Updated comments, alias, and ordering to reflect cloud services credits and scan metrics.

## Review Notes
- The examples assume `dbt_utils` is installed for `dbt_utils.generate_surrogate_key`.
- Password authentication is shown for simplicity. For production Snowflake deployments, key pair or OAuth authentication may be preferable depending on the organization's security requirements.
