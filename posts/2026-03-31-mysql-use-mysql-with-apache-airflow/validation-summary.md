# Validation Summary: How to Use MySQL with Apache Airflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Apache Airflow (2.7+)
- apache-airflow-providers-mysql
- MySqlOperator
- MySqlHook
- SQLAlchemy (metadata database connection)

## Sources Consulted
- Apache Airflow MySQL Provider documentation: https://airflow.apache.org/docs/apache-airflow-providers-mysql/stable/index.html
- Apache Airflow database configuration: https://airflow.apache.org/docs/apache-airflow/stable/howto/set-up-database.html
- Apache Airflow CLI reference (db commands): https://airflow.apache.org/docs/apache-airflow/stable/cli-and-env-variables-ref.html
- Apache Airflow Amazon Provider (SqlToS3Operator): https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/transfer/sql_to_s3.html

## Issues Found

1. **Incorrect claim about `MySqlToS3Operator`**: The post stated that `pip install apache-airflow-providers-mysql` installs `MySqlToS3Operator`. This is incorrect -- the S3 transfer operator (`SqlToS3Operator`) lives in `apache-airflow-providers-amazon`, not the MySQL provider. Fixed the text to clarify that S3 integration requires the Amazon provider package.

2. **Redundant and deprecated database init commands**: The post showed running both `airflow db init` and `airflow db upgrade`, which is redundant (`init` already runs migrations). Additionally, `airflow db init` was deprecated in Airflow 2.7.0 in favor of `airflow db migrate`. Replaced both commands with the single `airflow db migrate` command.

3. **Non-existent `MySQLToMySQLOperator`**: The post used `MySQLToMySQLOperator` from `airflow.providers.mysql.transfers.mysql_to_mysql`, which does not exist in the MySQL provider. The provider's transfer modules only include `presto_to_mysql`, `s3_to_mysql`, `trino_to_mysql`, and `vertica_to_mysql`. Replaced the section with a working approach using `MySqlHook` with `get_records()` and `insert_rows()` inside a `@task`-decorated function.

4. **`context` used outside task execution**: The original `MySQLToMySQLOperator` example referenced `context['ds']` at DAG parse time (outside a task callable), where the Airflow execution context is not available. The replacement code correctly accesses `context` inside a `@task` function where it is provided at runtime.

## Review Notes
- `MySqlOperator` is deprecated in recent provider versions in favor of `SQLExecuteQueryOperator` from `airflow.providers.common.sql`. The code still works but may emit deprecation warnings. A future update could migrate the example to `SQLExecuteQueryOperator` with `conn_id` instead of `mysql_conn_id`.
- The `mysql+mysqlconnector://` connection scheme requires `mysql-connector-python` to be installed. An alternative is `mysql+pymysql://` with the `pymysql` package. Both are valid choices.
