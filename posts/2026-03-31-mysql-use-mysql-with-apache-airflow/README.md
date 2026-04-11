# How to Use MySQL with Apache Airflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Apache Airflow, ETL

Description: Use MySQL as the Airflow metadata database and as a data source in DAGs, with MySqlOperator, MySqlHook, and connection configuration.

---

Apache Airflow supports MySQL in two ways: as the metadata database that stores DAG runs and task state, and as a data source you can query from within DAGs using operators and hooks. Both configurations require the `apache-airflow-providers-mysql` package.

## Installing the MySQL Provider

```bash
pip install apache-airflow-providers-mysql
```

This installs the `MySqlOperator`, `MySqlHook`, and related transfer operators. For S3 integration, you also need `apache-airflow-providers-amazon`.

## Using MySQL as the Airflow Metadata Database

Create the database and user first:

```sql
CREATE DATABASE airflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'airflow'@'localhost' IDENTIFIED BY 'airflowpassword';
GRANT ALL PRIVILEGES ON airflow_db.* TO 'airflow'@'localhost';
FLUSH PRIVILEGES;
```

Set the connection string in `airflow.cfg` or as an environment variable:

```text
AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=mysql+mysqlconnector://airflow:airflowpassword@127.0.0.1:3306/airflow_db
```

Then initialize the database:

```bash
airflow db migrate
```

## Configuring a MySQL Data Source Connection

In the Airflow UI: Admin > Connections > Add Connection.

Or set via environment variable:

```text
AIRFLOW_CONN_MYSQL_DEFAULT=mysql://app_user:password@127.0.0.1:3306/app_db
```

## Querying MySQL in a DAG with MySqlOperator

```python
from airflow import DAG
from airflow.providers.mysql.operators.mysql import MySqlOperator
from datetime import datetime

with DAG(
    dag_id='mysql_cleanup',
    start_date=datetime(2024, 1, 1),
    schedule='@daily',
    catchup=False,
) as dag:

    cleanup = MySqlOperator(
        task_id='delete_old_logs',
        mysql_conn_id='mysql_default',
        sql="""
            DELETE FROM app_logs
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            LIMIT 1000;
        """,
    )
```

## Using MySqlHook for Fetch Operations

```python
from airflow.providers.mysql.hooks.mysql import MySqlHook

def process_recent_orders(**context):
    hook = MySqlHook(mysql_conn_id='mysql_default')
    records = hook.get_records(
        "SELECT id, total FROM orders WHERE status = 'pending' LIMIT 100"
    )
    for row in records:
        print(f"Order {row[0]}: ${row[1]}")
```

## Transferring Data Between MySQL Connections

```python
from airflow.decorators import task
from airflow.providers.mysql.hooks.mysql import MySqlHook

@task
def replicate_products(**context):
    source_hook = MySqlHook(mysql_conn_id='mysql_source')
    dest_hook = MySqlHook(mysql_conn_id='mysql_dest')
    records = source_hook.get_records(
        "SELECT * FROM products WHERE updated_at > %s",
        parameters=(context['ds'],),
    )
    dest_hook.insert_rows(
        table='products_copy',
        rows=records,
    )
```

## Summary

Apache Airflow integrates with MySQL as both a metadata store and a data pipeline target. Use `utf8mb4` for the metadata database, configure connections through environment variables for CI/CD compatibility, and prefer `MySqlHook` for data retrieval in Python callables where you need to process results programmatically.
