# How to Deploy Prefect via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Prefect, Data Workflow, Docker, Python

Description: Deploy Prefect workflow orchestration server using Portainer to schedule and monitor Python data pipelines.

## Introduction

Prefect is a modern workflow orchestration framework for data pipelines. It provides a Python-first API to define flows (workflows) and tasks, plus a web UI for scheduling, monitoring, and managing runs. Prefect supports self-hosted server deployments.

## Prerequisites

- Portainer connected to a Docker Standalone environment
- Python 3.10+ for running local flows and workers

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Prefect Server

version: "3.8"

services:
  prefect-server:
    image: prefecthq/prefect:3-latest
    container_name: prefect_server
    restart: unless-stopped
    ports:
      - "4200:4200"
    volumes:
      - prefect_data:/root/.prefect
    environment:
      - PREFECT_SERVER_UI_ENABLED=true
      - PREFECT_SERVER_API_HOST=0.0.0.0
      - PREFECT_SERVER_UI_API_URL=http://${PREFECT_HOST}:4200/api
      - PREFECT_API_DATABASE_CONNECTION_URL=postgresql+asyncpg://prefect:${DB_PASSWORD}@prefect_postgres:5432/prefect
    command: prefect server start --host 0.0.0.0 --port 4200
    depends_on:
      prefect_postgres:
        condition: service_healthy
    networks:
      - prefect_net

  prefect_postgres:
    image: postgres:16-alpine
    container_name: prefect_postgres
    restart: unless-stopped
    volumes:
      - prefect_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=prefect
      - POSTGRES_USER=prefect
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prefect -d prefect"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - prefect_net

volumes:
  prefect_data:
  prefect_postgres_data:

networks:
  prefect_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DB_PASSWORD=your-postgres-password
PREFECT_HOST=your-server-ip-or-dns-name
```

## Step 3: Access the Prefect UI

Open `http://<PREFECT_HOST>:4200` to view the Prefect dashboard.

## Step 4: Deploy a Flow

Install the Prefect client and point it at your server:

```bash
pip install -U prefect

# Configure Prefect client to use your server
prefect config set PREFECT_API_URL=http://<PREFECT_HOST>:4200/api
```

Create a flow:

```python
# my_flow.py
import json
from urllib.request import urlopen

from prefect import flow, task

@task(retries=3, retry_delay_seconds=10)
def fetch_data(url: str) -> list[dict]:
    with urlopen(url, timeout=30) as response:
        return json.load(response)

@task
def process_data(data: list[dict]) -> None:
    print(f"Processing {len(data)} records")

@flow(name="data-pipeline", log_prints=True)
def data_pipeline(url: str = "https://jsonplaceholder.typicode.com/todos"):
    data = fetch_data(url)
    process_data(data)

if __name__ == "__main__":
    data_pipeline()
```

## Step 5: Schedule and Deploy the Flow

```python
# deploy_flow.py
from pathlib import Path

from my_flow import data_pipeline

if __name__ == "__main__":
    data_pipeline.from_source(
        source=str(Path(__file__).parent),
        entrypoint="my_flow.py:data_pipeline",
    ).deploy(
        name="production",
        work_pool_name="local-process-pool",
        cron="0 * * * *",
    )
```

```bash
# Create a process work pool
prefect work-pool create --type process local-process-pool

# Create a deployment with a schedule
python deploy_flow.py

# Queue a manual run; it will execute after the worker in Step 6 starts
prefect deployment run "data-pipeline/production"
```

## Step 6: Start a Worker to Execute Flows

```bash
# Workers pull flow runs from the server and execute them
prefect worker start --pool local-process-pool
```

## Conclusion

Prefect Server can use SQLite for basic local use, but PostgreSQL is the better choice for a durable self-hosted deployment and is required for higher-scale multi-worker API server setups. The `PREFECT_SERVER_UI_API_URL` must be reachable from the browser - set it to the external IP address or DNS name of your server. Workers poll work pools for scheduled runs and execute them in the configured infrastructure. If you use `from_source(..., source=local_path)` with a Process work pool, run the worker on a machine that can access that same local path. Use `@task(cache_key_fn=task_input_hash)` for idempotent pipelines that skip recomputation of unchanged inputs.
