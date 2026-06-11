# Validation Summary: How to Build Data Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Pydantic
- AWS SQS / boto3
- Great Expectations / GX Core
- Apache Airflow
- dbt and dbt-utils
- GitHub Actions
- Prometheus Python client
- Slack, PagerDuty, and OneUptime webhook-style alerting

## Sources Consulted
- Pydantic validators documentation: https://pydantic.dev/docs/validation/latest/concepts/validators/
- Pydantic configuration documentation: https://pydantic.dev/docs/validation/latest/concepts/config/
- Great Expectations install documentation: https://docs.greatexpectations.io/docs/core/set_up_a_gx_environment/install_gx
- Great Expectations DataFrame validation workflow: https://docs.greatexpectations.io/docs/core/introduction/try_gx
- Great Expectations DataFrame data source documentation: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- Great Expectations integrity expectation documentation: https://docs.greatexpectations.io/docs/reference/learn/data_quality_use_cases/integrity
- Apache Airflow 3 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow DAG API documentation: https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/models/dag/index.html
- dbt data tests documentation: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt data test configuration documentation: https://docs.getdbt.com/reference/data-test-configs
- dbt state selection documentation: https://docs.getdbt.com/reference/node-selection/methods
- dbt-utils package documentation: https://github.com/dbt-labs/dbt-utils
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Prometheus Python client documentation: https://github.com/prometheus/client_python
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2

## Issues Found
- The Pydantic example used the deprecated v1 `@validator` decorator and inner `Config` class. Updated it to Pydantic v2 `@field_validator` and `ConfigDict(extra="forbid")`, and changed UTC comparisons to use timezone-aware datetimes.
- The Great Expectations setup used `great_expectations init`, which is no longer part of the current documented GX Core setup flow. Replaced it with an installation verification command.
- The Great Expectations suite and validation example used older `ExpectationConfiguration`, `context.add_or_update_expectation_suite`, `context.sources`, and `add_or_update_checkpoint` APIs. Updated the example to current GX Core expectation classes, suites, dataframe data sources, validation definitions, and checkpoints.
- The Airflow DAG used `schedule_interval`, which was deprecated in Airflow 2.4 and removed in Airflow 3. Updated it to the unified `schedule` argument.
- The Airflow validation statistics keys were expectation-level names, while current GX checkpoint results report validation-level statistics. Updated the XCom payload and alert message to use `evaluated_validations`, `successful_validations`, and `unsuccessful_validations`.
- The dbt CI workflow attempted to install `dbt-utils` with `pip`. `dbt-utils` is a dbt package installed by `dbt deps`, not a Python package dependency. Removed it from the `pip install` command.
- The dbt CI workflow used `dbt build --select state:modified+` without supplying a comparison manifest through `--state` or an equivalent environment variable. Replaced it with `dbt build --fail-fast` so the command works as a standalone CI example.
- The dbt `dbt_utils.equality` example compared a daily aggregate fact model directly to a staging transactions model. Updated the example to compare against an expected daily aggregate model and include the date key in compared columns.
- The Great Expectations result-processing examples assumed only the older `results` list and `expectation_type` field. Updated them to handle current `validation_results`, `expectation_config.type`, and metadata locations while retaining backward-compatible fallbacks.
- The Prometheus data freshness example used naive `datetime.utcnow()`. Updated it to use timezone-aware UTC timestamps.

## Review Notes
Great Expectations and Airflow were not installed in the local environment, so those examples were checked against official documentation instead of executed locally. Python code blocks were parsed successfully, and the updated Pydantic validation example was executed locally with Pydantic 2.13.4.
