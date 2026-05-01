# How to Deploy Temporal via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Temporal, Workflow, Docker, Microservice

Description: Deploy Temporal workflow orchestration platform using Portainer for durable, fault-tolerant application code execution.

## Introduction

Temporal is an open-source workflow orchestration platform that makes application code durable and fault-tolerant. It persists workflow state so code can resume after failures without losing progress. This guide deploys a Temporal Server with PostgreSQL and the Temporal Web UI.

## Prerequisites

- Portainer installed with Docker
- At least 2 GB RAM

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - Temporal

version: "3.8"

services:
  temporal:
    image: temporalio/auto-setup:1.24.2
    container_name: temporal
    restart: unless-stopped
    ports:
      - "7233:7233"    # gRPC frontend service
    environment:
      - DB=postgres12
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=${DB_PASSWORD}
      - POSTGRES_SEEDS=temporal_postgres
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development-sql.yaml
    depends_on:
      temporal_postgres:
        condition: service_healthy
    networks:
      - temporal_net

  temporal-ui:
    image: temporalio/ui:2.26.2
    container_name: temporal_ui
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:8080
    depends_on:
      - temporal
    networks:
      - temporal_net

  temporal_postgres:
    image: postgres:13-alpine
    container_name: temporal_postgres
    restart: unless-stopped
    volumes:
      - temporal_postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=temporal
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=temporal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U temporal"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - temporal_net

volumes:
  temporal_postgres_data:

networks:
  temporal_net:
    driver: bridge
```

## Step 2: Set Environment Variables in Portainer

```text
DB_PASSWORD=your-postgres-password
```

## Step 3: Access the Temporal Web UI

Open `http://<host>:8080` to view workflow executions, activities, and task queues.

## Step 4: Write a Temporal Workflow

```python
# pip install temporalio
import asyncio
from datetime import timedelta
from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker

@activity.defn
async def process_order(order_id: str) -> str:
    print(f"Processing order {order_id}")
    return f"Order {order_id} processed"

@activity.defn
async def send_confirmation(order_id: str, result: str) -> None:
    print(f"Sending confirmation for {order_id}: {result}")

@workflow.defn
class OrderWorkflow:
    @workflow.run
    async def run(self, order_id: str) -> str:
        result = await workflow.execute_activity(
            process_order,
            order_id,
            start_to_close_timeout=timedelta(minutes=5),
        )
        await workflow.execute_activity(
            send_confirmation,
            args=[order_id, result],
            start_to_close_timeout=timedelta(minutes=1),
        )
        return result

async def main():
    client = await Client.connect("localhost:7233")

    # Start a worker
    async with Worker(
        client,
        task_queue="order-queue",
        workflows=[OrderWorkflow],
        activities=[process_order, send_confirmation],
    ):
        # Execute a workflow
        result = await client.execute_workflow(
            OrderWorkflow.run,
            "order-12345",
            id="order-workflow-1",
            task_queue="order-queue",
        )
        print(f"Workflow result: {result}")

asyncio.run(main())
```

## Step 5: Check Workflow Status via CLI

```bash
# Install Temporal CLI
curl -sSf https://temporal.download/cli.sh | sh

# List workflows
temporal workflow list --address localhost:7233

# Show workflow details
temporal workflow describe --workflow-id order-workflow-1 --address localhost:7233
```

## Conclusion

Temporal persists workflow execution state and event history in PostgreSQL, enabling durable execution and resumption after failures. Retries can be configured through Temporal retry policies instead of custom workflow retry loops. The `auto-setup` image handles database schema migration on first run. The `temporalio/ui` container provides the web interface for monitoring. For production, configure TLS/mTLS in Temporal Server, and set the UI container's `TEMPORAL_TLS_*` environment variables if it connects to a TLS-enabled Temporal frontend.
