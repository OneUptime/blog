# How to Use ClickHouse with Dagster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dagster, Data Pipeline, ETL, Orchestration, Asset

Description: Integrate ClickHouse with Dagster to build data pipelines that load, transform, and materialize analytical assets using software-defined assets.

---

Dagster is a data orchestration platform built around software-defined assets. Connecting it to ClickHouse allows you to model ETL pipelines that ingest raw data, run transformations, and write results to ClickHouse tables.

## Installing Dependencies

```bash
pip install dagster dagster-webserver clickhouse-connect pandas
```

## Creating a ClickHouse Resource

Define a reusable ClickHouse resource in `resources.py`:

```python
from dagster import ConfigurableResource
import clickhouse_connect

class ClickHouseResource(ConfigurableResource):
    host: str = "localhost"
    port: int = 8123
    username: str = "default"
    password: str = ""
    database: str = "default"

    def get_client(self):
        return clickhouse_connect.get_client(
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            database=self.database
        )
```

## Defining Assets

Create `assets.py`:

```python
import pandas as pd
from dagster import asset
from resources import ClickHouseResource

@asset
def raw_events(clickhouse: ClickHouseResource) -> pd.DataFrame:
    client = clickhouse.get_client()
    result = client.query("""
        SELECT event_id, user_id, event_type, created_at
        FROM raw.events
        WHERE toDate(created_at) = today()
    """)
    return pd.DataFrame(result.result_rows, columns=result.column_names)

@asset
def daily_event_summary(clickhouse: ClickHouseResource, raw_events: pd.DataFrame):
    client = clickhouse.get_client()
    summary = raw_events.groupby('event_type').size().reset_index(name='count')
    client.insert_df('analytics.daily_event_summary', summary)
```

## Wiring Up the Definitions

Create `definitions.py`:

```python
from dagster import Definitions
from assets import raw_events, daily_event_summary
from resources import ClickHouseResource

defs = Definitions(
    assets=[raw_events, daily_event_summary],
    resources={
        "clickhouse": ClickHouseResource(
            host="localhost",
            database="default"
        )
    }
)
```

## Running the Pipeline

```bash
dagster dev
```

Open `http://localhost:3000` and materialize assets from the UI, or run from the CLI:

```bash
dagster asset materialize --select daily_event_summary
```

## Scheduling Asset Materialization

```python
from dagster import ScheduleDefinition, define_asset_job

daily_job = define_asset_job("daily_job", selection="*")

daily_schedule = ScheduleDefinition(
    job=daily_job,
    cron_schedule="0 2 * * *"
)
```

Add the schedule to `Definitions`.

## Summary

Dagster's asset-based model maps cleanly onto ClickHouse workflows. You define assets for raw data, transformations, and final analytical tables, then let Dagster handle scheduling, retries, and lineage tracking. This approach makes your ClickHouse pipelines testable, observable, and easy to reason about.
