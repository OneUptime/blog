# Validation Summary: How to Fix 'Data Quality' Validation Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Great Expectations / GX Core
- Python
- pandas
- dbt data tests
- dbt-utils
- Data quality monitoring and validation patterns

## Sources Consulted
- Great Expectations GX Core documentation: Create a Data Context - https://docs.greatexpectations.io/docs/core/set_up_a_gx_environment/create_a_data_context/
- Great Expectations GX Core documentation: Connect to dataframe data - https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- Great Expectations GX Core documentation: Create an Expectation - https://docs.greatexpectations.io/docs/core/define_expectations/create_an_expectation
- Great Expectations GX Core documentation: Organize Expectations into an Expectation Suite - https://docs.greatexpectations.io/docs/core/define_expectations/organize_expectation_suites/
- Great Expectations GX Core documentation: Create a Validation Definition - https://docs.greatexpectations.io/docs/core/run_validations/create_a_validation_definition/
- Great Expectations GX Core documentation: Run a Validation Definition - https://docs.greatexpectations.io/docs/core/run_validations/run_a_validation_definition/
- dbt documentation: About data tests property - https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt documentation: Data test configurations - https://docs.getdbt.com/reference/data-test-configs
- dbt-utils documentation - https://github.com/dbt-labs/dbt-utils

## Issues Found
- The Great Expectations setup used the older `great_expectations init` workflow and showed the legacy `great_expectations/` directory layout. Updated it to create a current file-based GX context with `gx.get_context(mode='file')` and adjusted the sample structure to the generated `gx/` layout.
- The expectation-suite example used deprecated pre-1.x APIs such as `ExpectationConfiguration`, `context.add_expectation_suite`, and `context.update_expectation_suite`. Replaced them with GX 1.x class-based expectations, `gx.ExpectationSuite`, and `context.suites.add`.
- The DataFrame validation example used the older `context.sources`, batch request, and validator flow. Replaced it with current `context.data_sources`, dataframe assets, whole-dataframe batch definitions, and `gx.ValidationDefinition.run(...)`.
- The date expectation used `parse_strings_as_datetimes`, which is not accepted by `ExpectColumnValuesToBeBetween` in GX 1.18. Updated the example to parse `order_date` with pandas and compare against `datetime` bounds.
- The validation-result handler referenced `result.expectation_config.expectation_type`, which is not the current GX 1.x property. Updated it to use `result.expectation_config.type`.
- The dbt YAML used the older `tests` property and top-level generic test arguments. Updated the example to use `data_tests` and nested `arguments`, matching current dbt documentation while preserving the same tests.

## Review Notes
The custom pandas validation examples are syntactically valid and reasonable as illustrative pipeline checks. In production, they would need additional handling for empty DataFrames, missing columns, timezone-aware timestamps, and filesystem setup for quarantine output.
