# Validation Summary: How to Implement ETL Pipeline Design

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- ETL and ELT pipeline architecture
- Python
- pandas
- SQLAlchemy
- Apache Kafka / kafka-python
- Debezium-style CDC events
- dbt
- PostgreSQL upsert syntax
- Snowflake MERGE and Python connector
- Apache Airflow
- Prometheus Python client

## Sources Consulted
- SQLAlchemy documentation: https://docs.sqlalchemy.org/en/latest/core/sqlelement.html
- SQLAlchemy SQL expression FAQ: https://docs.sqlalchemy.org/en/latest/faq/sqlexpressions.html
- pandas read_sql documentation: https://pandas.pydata.org/docs/reference/api/pandas.read_sql.html
- pandas DataFrame.astype documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.astype.html
- pandas text data guide: https://pandas.pydata.org/docs/user_guide/text.html
- pandas DataFrame.to_sql documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_sql.html
- dbt node selection syntax: https://docs.getdbt.com/reference/node-selection/syntax
- Apache Airflow 3 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow Task SDK API reference: https://airflow.apache.org/docs/task-sdk/stable/api.html
- Apache Airflow standard provider PythonOperator documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/python/index.html
- Apache Airflow standard provider BashOperator documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/bash/index.html
- Snowflake MERGE documentation: https://docs.snowflake.com/en/sql-reference/sql/merge
- Snowflake Python connector API documentation: https://docs.snowflake.com/en/developer-guide/python-connector/python-connector-api
- Snowflake connector write_pandas implementation documentation: https://github.com/snowflakedb/snowflake-connector-python/blob/main/src/snowflake/connector/pandas_tools.py
- Debezium event deserialization documentation: https://debezium.io/documentation/reference/stable/integrations/serdes.html
- kafka-python KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/master/apidoc/KafkaConsumer.html
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Python client documentation: https://prometheus.github.io/client_python/

## Issues Found
- SQLAlchemy/pandas parameter binding used DBAPI-style placeholders in SQL strings. Updated the examples to use SQLAlchemy `text()` with named `:parameter` binds, matching current SQLAlchemy/pandas usage.
- The email validation rule allowed missing values to pass because pandas string methods can propagate missing results. Added `na=False` so invalid or missing email values fail the warning-level rule.
- The cleaning example used `astype(str)` for strings and `astype(bool)` for booleans. `astype(str)` can turn missing values into string values, and `astype(bool)` treats non-empty strings such as `"False"` as `True`. Updated the code to use pandas nullable string dtype and explicit boolean normalization.
- The string-cleaning helper only selected `object` columns, so pandas `string` dtype columns would not be stripped or normalized. Updated it to include both `object` and `string` columns.
- The Snowflake merge example referenced an undefined `parse_snowflake_connection()` helper. Changed the function to accept connector parameters directly, which matches `snowflake.connector.connect(**conn_params)`.
- The Snowflake staging load mixed unquoted SQL identifiers with `write_pandas` default quoted identifiers. Updated the staging table name and `write_pandas(..., quote_identifiers=False)` to keep identifier handling consistent.
- The Airflow DAG used deprecated/removed authoring APIs for current Airflow, including `schedule_interval`, `days_ago`, old imports, and `execution_date`. Updated the example to use Airflow 3 public SDK/provider imports, `schedule`, a pendulum start date, `logical_date`, and `data_interval_start` / `data_interval_end`.
- The Airflow DAG pulled XCom data from `transform_sales`, but no `transform_sales` task existed. Added the missing `PythonOperator` task and wired it into the dependency chain.
- The custom Airflow sensor used the legacy `apply_defaults` decorator and non-public import style for current Airflow. Removed the decorator and updated the imports to the Airflow SDK public API.

## Review Notes
- The SQL examples are illustrative and still assume trusted table, schema, and column identifiers. Production code should validate or quote identifiers instead of accepting arbitrary user input.
- Several SQL snippets use warehouse-specific SQL functions such as `datediff` and `date_trunc`; they are appropriate for Snowflake-style examples but would need adapter-specific changes for BigQuery or other warehouses.
- The PostgreSQL upsert example requires a unique or exclusion constraint matching the `ON CONFLICT` columns.
