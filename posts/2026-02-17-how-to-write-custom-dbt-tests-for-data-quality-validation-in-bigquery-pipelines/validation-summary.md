# Validation Summary: How to Write Custom dbt Tests for Data Quality Validation in BigQuery Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dbt data tests
- dbt generic and singular tests
- dbt CLI
- dbt YAML configuration
- BigQuery SQL / GoogleSQL

## Sources Consulted
- dbt data tests documentation: https://docs.getdbt.com/docs/build/data-tests
- dbt test command reference: https://docs.getdbt.com/reference/commands/test
- dbt data_tests property reference: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt severity, error_if, and warn_if config reference: https://docs.getdbt.com/reference/resource-configs/severity
- dbt store_failures config reference: https://docs.getdbt.com/reference/resource-configs/store_failures
- dbt node selector methods reference: https://docs.getdbt.com/reference/node-selection/methods
- dbt exclude selector reference: https://docs.getdbt.com/reference/node-selection/exclude
- BigQuery date functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions
- BigQuery array functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions
- BigQuery timestamp functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery string functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/string_functions

## Issues Found
- Updated dbt YAML examples from the legacy `tests:` key to the current `data_tests:` key. dbt still supports `tests:` as an alias, but current docs use `data_tests:` after the introduction of unit tests.
- Moved generic test arguments under `arguments:` in YAML examples. Current dbt docs recommend nesting test inputs under `arguments`, with older top-level argument syntax retained for backward compatibility.
- Moved per-test options such as `severity`, `error_if`, and `warn_if` under `config:`. Current dbt docs show these as data test configurations rather than generic test arguments.
- Replaced the invalid `dbt test --severity error` command with `dbt test --exclude "config.severity:warn"`, using dbt's documented selector and exclude syntax to skip warning-severity tests.
- Updated the `store_failures` project config from `tests:` to `data_tests:` and softened the BigQuery dataset wording because dbt schema naming may be customized or suffixed depending on project configuration.

## Review Notes
The BigQuery SQL examples use valid GoogleSQL functions and syntax, including `GENERATE_DATE_ARRAY`, `DATE_SUB`, `TIMESTAMP_DIFF`, and `REGEXP_CONTAINS`. The dbt CLI was not available in the local environment, so command validation was performed against official dbt documentation.
