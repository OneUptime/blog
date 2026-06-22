# Validation Summary: How to Orchestrate ClickHouse Pipelines with Apache Airflow

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Airflow
- ClickHouse
- airflow-clickhouse-plugin
- clickhouse-driver
- Airflow TaskFlow API
- Airflow Slack provider
- ClickHouse MergeTree tables and partitions

## Sources Consulted
- Apache Airflow provider package reference: https://airflow.apache.org/docs/apache-airflow-providers/packages-ref.html
- Apache Airflow DAG scheduling deprecation notes: https://airflow.apache.org/docs/apache-airflow/2.4.0/release_notes.html
- Apache Airflow templates reference: https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html
- Apache Airflow SlackWebhookOperator docs: https://airflow.apache.org/docs/apache-airflow-providers-slack/stable/operators/slack_webhook.html
- airflow-clickhouse-plugin documentation and source: https://github.com/bryzgaloff/airflow-clickhouse-plugin
- clickhouse-driver API documentation: https://clickhouse-driver.readthedocs.io/en/latest/api.html
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse virtual columns documentation: https://clickhouse.com/docs/engines/table-engines

## Issues Found
- The post used `apache-airflow-providers-clickhouse` and `airflow.providers.clickhouse...` imports as if ClickHouse had a current official Apache Airflow provider. Updated the install command and imports to the maintained `airflow-clickhouse-plugin` package and its documented import paths.
- The connection UI guidance implied a dedicated ClickHouse connection type. Updated it to match the plugin documentation, which reads standard Airflow connection fields and recommends choosing SQLite or another SQL connection type in the UI.
- Hook examples used `hook.run(...)` and `parameters=...`, but `airflow-clickhouse-plugin` exposes `ClickHouseHook.execute(...)` and passes query values as `params`. Updated hook calls accordingly.
- Several examples treated ClickHouse query results as dictionaries. `clickhouse-driver` returns rows as tuples by default, so result handling was changed to tuple indexing/unpacking.
- The parameterized query defined `parameters` but still inlined `{{ ds }}` in the SQL. Updated it to use ClickHouse driver parameter substitution with `%(date)s`.
- The data-quality Python callable expected Airflow Jinja rendering inside a raw hook SQL string. Updated it to read `ds` from the Python callable context and pass it as a driver parameter.
- The branch example returned `continue_pipeline` without defining that task. Added an `EmptyOperator` target and branch dependencies.
- The partition example built SQL with f-strings and filtered on a non-existent `partition` column in `raw_events`. Updated it to use parameter binding and ClickHouse's documented `_partition_id` virtual column.
- The Airflow DAG examples used deprecated `schedule_interval`. Updated them to the current `schedule` argument.
- The Slack webhook example used the old `http_conn_id` argument. Updated it to the current `slack_webhook_conn_id` argument.
- The monitoring SQL rendered `task_instance.duration` directly, which can be `None` while the task is executing. Updated it to render `0` when no duration is available.

## Review Notes
The examples remain illustrative and assume compatible table schemas, partitioning choices, and Airflow/plugin versions. The maintained ClickHouse Airflow integration used here is a community plugin rather than an official Apache Airflow provider.
