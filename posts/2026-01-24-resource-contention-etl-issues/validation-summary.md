# Validation Summary: How to Fix 'Resource Contention' ETL Issues

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- ETL pipeline resource management
- Apache Spark / PySpark
- Apache Airflow
- PostgreSQL
- SQLAlchemy
- psycopg2
- Redis
- Prometheus Python client
- psutil
- Linux resource monitoring tools

## Sources Consulted
- Apache Spark configuration documentation: https://spark.apache.org/docs/latest/configuration.html
- PySpark DataFrame checkpoint API: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.checkpoint.html
- PySpark concat/concat_ws function documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.concat_ws.html
- Apache Airflow 3.2 release notes for schedule changes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow Task SDK documentation: https://airflow.apache.org/docs/task-sdk/stable/index.html
- Apache Airflow standard provider PythonOperator documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/python/index.html
- Apache Airflow pools documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/pools.html
- Apache Airflow common SQL hook documentation: https://airflow.apache.org/docs/apache-airflow-providers-common-sql/stable/_api/airflow/providers/common/sql/hooks/sql/index.html
- Apache Airflow PostgresHook documentation: https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/hooks/postgres/index.html
- SQLAlchemy pooling documentation: https://docs.sqlalchemy.org/en/latest/core/pooling.html
- SQLAlchemy connection execution documentation: https://docs.sqlalchemy.org/en/latest/core/connections.html
- PostgreSQL SELECT locking documentation: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL INSERT ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL table partitioning documentation: https://www.postgresql.org/docs/current/ddl-partitioning.html
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- redis-py pipeline/transaction documentation: https://redis.io/docs/latest/develop/clients/redis-py/transpipe/

## Issues Found
- The Linux monitoring snippet parsed only the user CPU percentage from `top`, not total CPU usage. Changed the `awk` expression to calculate total busy CPU as `100 - idle`.
- Spark runtime memory settings were being changed after `SparkSession` creation. Moved off-heap and shuffle compression settings into the session builder so they are applied at application startup.
- The Spark memory helper accepted a job-level `memory_budget_gb` name even though Spark executor memory settings are per executor. Renamed it to `executor_budget_gb` and guarded small budgets with `max(1, ...)`.
- The salting repartition example left helper columns in the returned DataFrame and used a less explicit concat expression. Changed it to use `concat_ws`, explicit column casts, and drop the temporary salt columns after repartitioning.
- The SQLAlchemy example used `time.sleep()` without importing `time`. Added the import.
- The SQLAlchemy example passed plain SQL strings directly to `Connection.execute()`, which is not valid in SQLAlchemy 2.x. Wrapped string queries with `sqlalchemy.text()`.
- The Airflow PostgresHook import used the old provider path. Updated it to `airflow.providers.postgres.hooks.postgres.PostgresHook`.
- The Airflow engine-pool example mutated SQLAlchemy pool internals via `engine.pool._pool.maxsize`. Replaced this with `get_sqlalchemy_engine(engine_kwargs=...)`, which is the documented hook API.
- The Airflow DAG used `schedule_interval`, which Airflow 3 removes. Updated it to `schedule`.
- The Airflow DAG imports used legacy paths for DAG, TaskGroup, and PythonOperator. Updated them to current Airflow 3-compatible public/provider imports.
- The Redis semaphore implementation performed multi-step sorted-set operations without atomicity. Replaced the acquire path with a Redis Lua script so cleanup, count, and insert execute atomically on the server.
- The Prometheus monitoring decorator used `wraps` and `time` without importing them in that standalone snippet. Added the missing imports.

## Review Notes
- The examples are educational snippets and still require environment-specific setup, such as Airflow pools, Spark cluster dynamic allocation support, Redis availability, PostgreSQL schema/indexes, and write permissions for `/var/log/etl_resources.log`.
- The Python snippets are syntactically valid after review. Some referenced task callables in the Airflow example are intentionally placeholders.
