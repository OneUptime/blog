# How to Run Prefect in Docker for Data Pipeline Orchestration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Prefect, Data Pipelines, Orchestration, Python, ETL, Docker Compose, Automation

Description: Deploy Prefect in Docker to orchestrate data pipelines, ETL workflows, and scheduled Python tasks with built-in retry and monitoring.

---

Prefect is a modern workflow orchestration framework for Python that makes building, scheduling, and monitoring data pipelines straightforward. Unlike Airflow, which requires you to define pipelines as DAGs with a specific syntax, Prefect lets you write normal Python functions and decorate them as tasks and flows. Running Prefect in Docker gives you an isolated, reproducible environment for both the orchestration server and your pipeline workers.

## Why Prefect?

Prefect takes a different approach to orchestration. You write Python code that looks like regular Python code. Decorators mark functions as tasks and flows. Prefect handles scheduling, retries, caching, concurrency, and monitoring. The server provides a dashboard for observing pipeline runs in real time.

The key difference from Airflow: Prefect does not require a DAG definition file. Your Python code defines the workflow implicitly through function calls.

## Docker Compose Setup

Here is a complete setup with Prefect server, PostgreSQL for state storage, and a worker:

```yaml
# docker-compose.yml - Prefect orchestration platform
version: "3.8"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: prefect
      POSTGRES_PASSWORD: prefect
      POSTGRES_DB: prefect
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - prefect-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prefect"]
      interval: 10s
      timeout: 5s
      retries: 5

  prefect-server:
    image: prefecthq/prefect:2-python3.12
    command: prefect server start --host 0.0.0.0
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PREFECT_API_DATABASE_CONNECTION_URL: postgresql+asyncpg://prefect:prefect@postgres:5432/prefect
      PREFECT_SERVER_API_HOST: 0.0.0.0
    ports:
      # Prefect UI and API
      - "4200:4200"
    networks:
      - prefect-net

  worker:
    build:
      context: ./flows
    depends_on:
      - prefect-server
    environment:
      PREFECT_API_URL: http://prefect-server:4200/api
    command: prefect worker start --pool default-agent-pool --type process
    volumes:
      # Mount flow code so changes are reflected without rebuilding
      - ./flows:/app/flows
    networks:
      - prefect-net
    restart: unless-stopped

volumes:
  pgdata:

networks:
  prefect-net:
    driver: bridge
```

## Worker Dockerfile

Build a Docker image for the worker that includes your pipeline dependencies:

```dockerfile
# flows/Dockerfile - Prefect worker with data pipeline dependencies
FROM prefecthq/prefect:2-python3.12

WORKDIR /app

# Install pipeline-specific dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy flow definitions
COPY . .

CMD ["prefect", "worker", "start", "--pool", "default-agent-pool", "--type", "process"]
```

The requirements file for typical data pipelines:

```txt
# requirements.txt - Data pipeline dependencies
pandas==2.2.0
sqlalchemy==2.0.25
requests==2.31.0
boto3==1.34.25
psycopg2-binary==2.9.9
httpx==0.26.0
```

## Writing Your First Flow

Prefect flows are Python functions decorated with `@flow`. Tasks within them use the `@task` decorator:

```python
# flows/etl_pipeline.py - ETL pipeline that extracts, transforms, and loads data
from prefect import flow, task, get_run_logger
from prefect.tasks import task_input_hash
from datetime import timedelta
import pandas as pd
import requests
import sqlalchemy


@task(retries=3, retry_delay_seconds=10, cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=1))
def extract_data(api_url: str) -> dict:
    """Fetch data from an external API with automatic retries."""
    logger = get_run_logger()
    logger.info(f"Extracting data from {api_url}")

    response = requests.get(api_url, timeout=30)
    response.raise_for_status()

    data = response.json()
    logger.info(f"Extracted {len(data)} records")
    return data


@task
def transform_data(raw_data: dict) -> pd.DataFrame:
    """Clean and transform the raw API data into a structured DataFrame."""
    logger = get_run_logger()

    df = pd.DataFrame(raw_data)

    # Remove duplicates based on the ID column
    initial_count = len(df)
    df = df.drop_duplicates(subset=["id"])
    logger.info(f"Removed {initial_count - len(df)} duplicate records")

    # Normalize column names to lowercase with underscores
    df.columns = [col.lower().replace(" ", "_") for col in df.columns]

    # Convert date strings to datetime objects
    if "created_at" in df.columns:
        df["created_at"] = pd.to_datetime(df["created_at"])

    # Drop rows with missing critical fields
    df = df.dropna(subset=["id", "name"])

    logger.info(f"Transformed data: {len(df)} rows, {len(df.columns)} columns")
    return df


@task(retries=2, retry_delay_seconds=5)
def load_data(df: pd.DataFrame, table_name: str, connection_string: str) -> int:
    """Load the transformed DataFrame into a PostgreSQL table."""
    logger = get_run_logger()

    engine = sqlalchemy.create_engine(connection_string)

    # Write to the database, replacing existing data
    rows = df.to_sql(table_name, engine, if_exists="replace", index=False)

    logger.info(f"Loaded {len(df)} rows into {table_name}")
    return len(df)


@flow(name="ETL Pipeline", log_prints=True)
def etl_pipeline(
    api_url: str = "https://jsonplaceholder.typicode.com/users",
    table_name: str = "users",
    db_url: str = "postgresql://prefect:prefect@postgres:5432/prefect"
):
    """Main ETL flow that extracts, transforms, and loads data."""
    # Extract
    raw_data = extract_data(api_url)

    # Transform
    df = transform_data(raw_data)

    # Load
    row_count = load_data(df, table_name, db_url)

    print(f"Pipeline complete: {row_count} rows loaded into {table_name}")
    return row_count


if __name__ == "__main__":
    etl_pipeline()
```

## Deploying Flows

Register your flow with the Prefect server so it can be scheduled:

```python
# flows/deploy.py - Deploy flows to the Prefect server with schedules
from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule
from etl_pipeline import etl_pipeline


def deploy():
    """Create a deployment for the ETL pipeline with a daily schedule."""
    deployment = Deployment.build_from_flow(
        flow=etl_pipeline,
        name="daily-etl",
        work_pool_name="default-agent-pool",
        schedule=CronSchedule(cron="0 6 * * *", timezone="UTC"),
        parameters={
            "api_url": "https://jsonplaceholder.typicode.com/users",
            "table_name": "users",
            "db_url": "postgresql://prefect:prefect@postgres:5432/prefect"
        },
        tags=["etl", "daily"]
    )
    deployment.apply()
    print(f"Deployment '{deployment.name}' created successfully")


if __name__ == "__main__":
    deploy()
```

Run the deployment script:

```bash
# Deploy the flow to the Prefect server
docker compose exec worker python /app/flows/deploy.py
```

## Running Flows Manually

Trigger a flow run from the command line:

```bash
# Start a flow run via the Prefect CLI
docker compose exec worker \
  prefect deployment run "ETL Pipeline/daily-etl"
```

Or trigger it via the API:

```bash
# Trigger a flow run via the Prefect REST API
curl -X POST http://localhost:4200/api/deployments/$(curl -s http://localhost:4200/api/deployments/filter -H "Content-Type: application/json" -d '{"deployments":{"name":{"any_":["daily-etl"]}}}' | jq -r '.[0].id')/create_flow_run \
  -H "Content-Type: application/json"
```

## Building a Multi-Stage Pipeline

Chain multiple flows together for complex data processing:

```python
# flows/data_pipeline.py - Multi-stage pipeline with subflows
from prefect import flow, task, get_run_logger
import pandas as pd
import httpx


@task(retries=3, retry_delay_seconds=10)
def fetch_from_api(endpoint: str) -> list:
    """Fetch data from a REST API endpoint."""
    response = httpx.get(endpoint, timeout=30)
    response.raise_for_status()
    return response.json()


@task
def validate_records(records: list) -> list:
    """Validate and filter records, removing invalid entries."""
    logger = get_run_logger()
    valid = [r for r in records if r.get("id") and r.get("email")]
    logger.info(f"Validation: {len(valid)}/{len(records)} records passed")
    return valid


@task
def enrich_records(records: list) -> list:
    """Add computed fields to each record."""
    for record in records:
        record["domain"] = record.get("email", "").split("@")[-1]
        record["name_length"] = len(record.get("name", ""))
    return records


@flow(name="Stage 1 - Ingest")
def ingest_stage(api_url: str) -> list:
    """First pipeline stage: fetch and validate data."""
    raw = fetch_from_api(api_url)
    valid = validate_records(raw)
    return valid


@flow(name="Stage 2 - Enrich")
def enrich_stage(records: list) -> list:
    """Second pipeline stage: enrich validated data."""
    enriched = enrich_records(records)
    return enriched


@flow(name="Full Data Pipeline", log_prints=True)
def full_pipeline(api_url: str = "https://jsonplaceholder.typicode.com/users"):
    """Orchestrates the complete multi-stage data pipeline."""
    # Stage 1: Ingest
    records = ingest_stage(api_url)
    print(f"Ingested {len(records)} records")

    # Stage 2: Enrich
    enriched = enrich_stage(records)
    print(f"Enriched {len(enriched)} records")

    return enriched
```

## Monitoring and Observability

The Prefect UI at `http://localhost:4200` provides a dashboard with:

- Flow run history and status
- Task-level execution details
- Logs for each run
- Scheduling status
- Work pool health

You can also query flow run status via the API:

```bash
# Check recent flow runs via the API
curl -s http://localhost:4200/api/flow_runs/filter \
  -H "Content-Type: application/json" \
  -d '{"sort": "EXPECTED_START_TIME_DESC", "limit": 5}' | jq '.[] | {name: .name, state: .state_name}'
```

## Wrapping Up

Prefect in Docker provides a clean, isolated environment for orchestrating data pipelines. The decorator-based approach lets you write workflows as natural Python code, while the server handles scheduling, retries, and monitoring. Docker Compose ties the server, database, and workers together into a single portable stack. Whether you are building a simple ETL job or a complex multi-stage pipeline, Prefect keeps the orchestration logic out of your business code and into the platform where it belongs.
