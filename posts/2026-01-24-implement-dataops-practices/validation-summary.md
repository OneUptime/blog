# Validation Summary: How to Implement DataOps Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DataOps
- GitHub Actions
- Python dataclasses and type hints
- Apache Airflow
- dbt
- SQLFluff
- PySpark
- Great Expectations GX Core
- Prometheus Python client and Pushgateway
- Data freshness monitoring
- Data catalog metadata

## Sources Consulted
- GitHub Actions checkout action: https://github.com/actions/checkout
- GitHub Actions setup-python action: https://github.com/actions/setup-python
- Apache Airflow database setup documentation: https://airflow.apache.org/docs/apache-airflow/stable/installation/setting-up-the-database.html
- Apache Airflow PyPI installation documentation: https://airflow.apache.org/docs/apache-airflow/stable/installation/installing-from-pypi.html
- Apache Airflow 2.11 DagBag API documentation: https://airflow.apache.org/docs/apache-airflow/2.11.0/_api/airflow/models/dagbag/index.html
- dbt build command reference: https://docs.getdbt.com/reference/commands/build
- SQLFluff CLI reference: https://docs.sqlfluff.com/en/stable/reference/cli.html
- Apache Spark PySpark createDataFrame documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.SparkSession.createDataFrame.html
- Great Expectations dataframe data documentation: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- Great Expectations validation definition documentation: https://docs.greatexpectations.io/docs/core/run_validations/create_a_validation_definition/
- Great Expectations validation run documentation: https://docs.greatexpectations.io/docs/core/run_validations/run_a_validation_definition/
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html

## Issues Found
- The GitHub Actions workflow used older major versions of `actions/checkout` and `actions/setup-python`. Updated them to current documented major versions.
- The Airflow install step used an unconstrained `pip install apache-airflow==2.7.0`, which is not the recommended reproducible install pattern. Updated it to install Airflow 2.11.0 with an official constraints file.
- The Airflow DAG validation step used `airflow db init`, which is deprecated in favor of `airflow db migrate`. Updated the command and made `DagBag` explicitly scan the `dags` folder without example DAGs.
- The Great Expectations example used the old `RuntimeBatchRequest`, `add_expectation_suite`, and `context.run_checkpoint` style. Rewrote it to use GX Core's current expectation suite, Spark dataframe data source, batch definition, and validation definition flow.
- The Great Expectations comment said the order date check rejected future dates, but the code only checked date parsing. Updated the comment to match the implemented expectation.
- The Prometheus Pushgateway example called `push_to_gateway` with `registry=None`, but the API requires a registry. Added a `CollectorRegistry`, registered the metrics with it, and pushed that registry.
- The schema dataclass used `datetime = None` for a nullable field and modeled schema version metadata as an instance field. Updated `created_at` to `Optional[datetime]` and `_schema_version` to `ClassVar[str]`.
- Removed unused imports from the monitoring and catalog snippets.

## Review Notes
The Python snippets were syntax-checked after edits. External libraries such as Great Expectations, Airflow, Spark, and Prometheus were not installed in the local environment, so runtime behavior was verified against official documentation rather than by executing the snippets end to end.
