# How to Use ClickHouse with Prefect

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prefect, Data Pipeline, Orchestration, ETL, Workflow

Description: Build and schedule data pipelines that load and transform data in ClickHouse using Prefect flows and tasks with retries and observability.

---

Prefect is a modern data workflow orchestration platform. When connected to ClickHouse, you can build reliable ETL pipelines with retries, logging, and scheduling - all managed through Prefect's UI or CLI.

## Installing Dependencies

```bash
pip install prefect clickhouse-connect pandas
```

## Writing a Simple Flow

Create `pipeline.py`:

```python
import clickhouse_connect
import pandas as pd
from prefect import flow, task

def get_client():
    return clickhouse_connect.get_client(
        host='localhost',
        port=8123,
        username='default',
        password=''
    )

@task(retries=3, retry_delay_seconds=10)
def extract_from_source() -> pd.DataFrame:
    # Simulate extracting from an external source
    data = {
        'user_id': [1, 2, 3, 4, 5],
        'event': ['click', 'view', 'click', 'purchase', 'view'],
        'ts': pd.date_range('2024-01-01', periods=5, freq='h')
    }
    return pd.DataFrame(data)

@task
def load_to_clickhouse(df: pd.DataFrame):
    client = get_client()
    client.insert_df('default.events_staging', df)
    return len(df)

@task
def transform_in_clickhouse():
    client = get_client()
    client.command("""
        INSERT INTO analytics.daily_events
        SELECT
            toDate(ts) AS day,
            event,
            count() AS cnt
        FROM default.events_staging
        WHERE toDate(ts) = today()
        GROUP BY day, event
    """)

@flow(name="clickhouse-etl-pipeline")
def etl_pipeline():
    df = extract_from_source()
    count = load_to_clickhouse(df)
    transform_in_clickhouse()
    print(f"Loaded {count} rows and ran transformation")
```

## Running the Flow

```bash
python pipeline.py
```

Or trigger it from the Prefect CLI:

```bash
prefect deployment run clickhouse-etl-pipeline/default
```

## Deploying with a Schedule

```python
if __name__ == "__main__":
    etl_pipeline.serve(
        name="nightly-clickhouse-etl",
        cron="0 3 * * *"
    )
```

## Using Prefect Blocks for Credentials

Store ClickHouse credentials securely in a Prefect Block:

```python
from prefect.blocks.core import Block
from pydantic import SecretStr

class ClickHouseCredentials(Block):
    host: str
    port: int = 8123
    username: str = "default"
    password: SecretStr = SecretStr("")
```

## Summary

Prefect makes ClickHouse ETL pipelines observable and resilient. Tasks wrap individual operations with retries and logging, flows coordinate the pipeline steps, and deployments add scheduling. Combined with ClickHouse's fast insert and aggregation capabilities, you get a production-ready data pipeline stack.
