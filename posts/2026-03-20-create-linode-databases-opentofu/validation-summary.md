# Validation Summary: How to Create Linode Databases with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- Linode (Akamai Cloud) Managed Databases
- Linode Terraform provider (`linode/linode`)
- PostgreSQL
- MySQL
- Linode CLI (`linode-cli`)

## Sources Consulted
- Linode Terraform provider source (resource schema for `database_postgresql_v2` and `database_mysql_v2`): https://github.com/linode/terraform-provider-linode/tree/main/docs/resources
- `linode_database_postgresql_v2` resource docs: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/database_postgresql_v2.md
- `linode_database_mysql_v2` resource docs: https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/database_mysql_v2.md
- Provider schema source code (`updates` block, validators): https://github.com/linode/terraform-provider-linode/blob/main/linode/helper/databaseshared/updates.go
- PostgreSQL v2 framework schema (`host_secondary` deprecation in favor of `host_standby`): https://github.com/linode/terraform-provider-linode/blob/main/linode/databasepostgresqlv2/framework_resource_schema.go
- Akamai Managed Databases product docs (supported engines): https://techdocs.akamai.com/cloud-computing/docs/managed-databases
- Linode Docs guide: https://www.linode.com/docs/guides/managed-postgresql-databases-on-akamai-cloud-with-terraform/
- Linode API reference (Managed Databases): https://techdocs.akamai.com/linode-api/reference/post-databases-postgre-sql-instances

## Issues Found

1. **MongoDB is not supported by Linode Managed Databases.** The post described Linode Managed Databases as offering "PostgreSQL, MySQL, and MongoDB clusters" and the description listed MongoDB as a configuration covered. Linode/Akamai Managed Databases only supports MySQL and PostgreSQL. Removed MongoDB references from the description and intro paragraph.

2. **Resource names are deprecated/removed.** The post used `linode_database_postgresql` and `linode_database_mysql`. The current Linode Terraform provider only ships v2 versions: `linode_database_postgresql_v2` and `linode_database_mysql_v2`. The v1 resource docs no longer exist in `docs/resources/` — using the old names will fail. Renamed every resource block and corresponding output reference to the `_v2` form.

3. **`updates` is now a single nested attribute, not a block.** The post used HCL block syntax (`updates { ... }`). In v2, `updates` is a `SingleNestedAttribute`, requiring attribute-assignment syntax (`updates = { ... }`). Updated all `updates` blocks.

4. **`day_of_week` is an integer, not a string.** The provider source code (`databaseshared/updates.go`) defines `day_of_week` as `Int64Attribute` validated `Between(1, 7)` ("1 is Monday, 2 is Tuesday, through to 7 which is Sunday"). The post used strings (`"saturday"`, `"sunday"`). Replaced `"saturday"` with `6` and `"sunday"` with `7`, and added a clarifying comment.

5. **`frequency = "monthly"` is not supported.** The provider source explicitly states: `Description: "How frequently maintenance occurs. Currently can only be weekly."` with a static default of `"weekly"`. Changed the PostgreSQL example's `frequency = "monthly"` to `frequency = "weekly"`.

6. **`week_of_month` field removed.** This field existed on the v1 resource (with monthly frequency) but is not present in the v2 schema at all. Removed it from the PostgreSQL example.

7. **`host_secondary` is deprecated.** The provider schema source marks `host_secondary` with `DeprecationMessage: "Use host_standby instead."` Updated the HA PostgreSQL example to use `host_standby` (and renamed the output from `ha_replica` to `ha_standby` to match).

8. **MySQL `engine_id` format is too specific.** The post used `mysql/8.0.30`. The provider's official examples use the major-version form (`mysql/8`, `mysql/16`). Switched to `mysql/8` to match the supported format.

9. **`cluster_size` HA comment was incomplete.** The post said "1 for standalone, 3 for HA". Linode's docs note clusters can be 1, 2, or 3 nodes. Updated the inline comment to "1 for standalone, 2 or 3 for HA".

## Review Notes

- The `duration` field is documented in the v1 docs and Linode API as valid range 1..3 hours, but the v2 source code does not include a numeric validator on `duration`. Linode's own v2 docs example uses `duration = 4`, so the practical bound may be looser than 1..3. The post's values (`1` and `2`) are within both ranges, so no change was needed.
- The `region = "us-east"` value uses the legacy region slug. Newer Linode docs prefer the form `us-mia`, `us-iad`, etc. The legacy `us-east` slug is still accepted, so this was left as-is.
- The post does not mention provider configuration or `terraform`/`opentofu` block requirements, which is fine since the post is scoped to database resources specifically (the broader provider setup is covered in companion posts).
- The `engine_config_*` parameters (40+ tuning knobs) available on v2 are not covered. That's an intentional scope choice and not an error.
- Future maintenance: if Linode reintroduces monthly maintenance windows or new engines (e.g., Valkey/Redis-compatible), this post may need updating again.
