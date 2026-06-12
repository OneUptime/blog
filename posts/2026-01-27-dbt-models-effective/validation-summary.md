# Validation Summary: How to Write Effective dbt Models

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- dbt models and materializations
- dbt sources, refs, and documentation
- dbt generic and singular data tests
- dbt Jinja macros
- dbt incremental models and strategies
- BigQuery dbt adapter partitioning and clustering
- GitHub Actions CI/CD

## Sources Consulted
- dbt materializations: https://docs.getdbt.com/docs/build/materializations
- dbt incremental models: https://docs.getdbt.com/docs/build/incremental-models
- dbt incremental strategies and incremental_predicates: https://docs.getdbt.com/docs/build/incremental-strategy
- dbt sources and freshness configuration: https://docs.getdbt.com/docs/build/sources
- dbt data tests property: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt data test configurations: https://docs.getdbt.com/reference/data-test-configs
- dbt test-paths and singular tests: https://docs.getdbt.com/reference/project-configs/test-paths
- dbt documentation and docs blocks: https://docs.getdbt.com/docs/build/documentation
- dbt BigQuery configurations: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- dbt state selection: https://docs.getdbt.com/reference/node-selection/state-selection
- actions/checkout releases: https://github.com/actions/checkout/releases
- dbt-utils expression_is_true implementation: https://raw.githubusercontent.com/dbt-labs/dbt-utils/main/macros/generic_tests/expression_is_true.sql

## Issues Found
- Updated source freshness YAML to place `freshness` and `loaded_at_field` under `config`, matching current dbt documentation. The previous top-level form is older syntax.
- Updated the testing terminology from schema/custom tests to generic/singular data tests, matching current dbt terminology.
- Updated YAML examples from `tests` to `data_tests` and nested test inputs under `arguments`, matching current dbt syntax for v1.10.5 and later.
- Updated the `dbt_project.yml` test configuration key from `tests` to `data_tests`.
- Updated the CI command using `state:modified+` to include `--state ./state` and a note that a prior manifest is required. The state selector requires a comparison manifest path.
- Updated the GitHub Actions checkout step from `actions/checkout@v3` to `actions/checkout@v5`, the current major release.

## Review Notes
The examples remain intentionally warehouse-generic in several places, so date arithmetic syntax may need small adapter-specific changes in a real dbt project. The BigQuery partitioning and clustering example matches the dbt BigQuery adapter configuration pattern.
