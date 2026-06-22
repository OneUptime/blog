# Validation Summary: How to Handle dbt Data Transformations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dbt
- SQL
- YAML
- Jinja macros
- dbt-utils
- Data tests
- Incremental models
- Snapshots

## Sources Consulted
- dbt Developer Hub: Incremental models - https://docs.getdbt.com/docs/build/incremental-models
- dbt Developer Hub: dbt_project.yml - https://docs.getdbt.com/reference/dbt_project.yml
- dbt Developer Hub: Data tests property - https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt Developer Hub: Data testing guide - https://docs.getdbt.com/docs/build/data-tests
- dbt Developer Hub: Snapshots - https://docs.getdbt.com/docs/build/snapshots
- dbt Developer Hub: Snapshot configurations - https://docs.getdbt.com/reference/snapshot-configs
- dbt Developer Hub: State comparison caveats - https://docs.getdbt.com/reference/node-selection/state-comparison-caveats
- dbt Developer Hub: Command reference - https://docs.getdbt.com/reference/dbt-commands
- dbt Developer Hub: Logs / debug flag - https://docs.getdbt.com/reference/global-configs/logs
- dbt-utils README - https://github.com/dbt-labs/dbt-utils

## Issues Found
- The incremental model filter used `max(updated_at_utc)` directly. If the target table exists but is empty, this evaluates to `NULL` and filters out all source rows. Updated it to use `coalesce(max(updated_at_utc), '1900-01-01')`, matching the dbt documentation pattern.
- The YAML test examples used the legacy `tests:` key and placed test arguments at the top level. Updated them to current `data_tests:` syntax with arguments nested under `arguments:`.
- The snapshot example used legacy SQL/Jinja snapshot configuration and `invalidate_hard_deletes`, which is still supported for existing snapshots but is not recommended for new snapshots. Replaced it with the current dbt Core v1.9+ YAML snapshot format and `hard_deletes: invalidate`.
- The state selection command implied dbt can determine changes "since last run" without prior artifacts. Updated the comment and command to compare against a previous manifest using `--state path/to/artifacts`.
- The project structure omitted the `snapshots/` directory even though the post later defines a snapshot. Added the directory to keep the example project coherent.

## Review Notes
- The SQL examples use warehouse-specific functions such as `convert_timezone`, `datediff`, and `extract(dow ...)`; these are common in dbt projects but may require adapter-specific adjustments.
- The examples use `dbt_utils.date_spine` and `dbt_utils.accepted_range`, so a real project must declare the `dbt-utils` package dependency before running `dbt deps`.
