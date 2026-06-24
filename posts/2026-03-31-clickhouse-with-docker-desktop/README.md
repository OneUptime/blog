# How to Set Up ClickHouse with Docker Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker Desktop, macOS, Window, Local Development, Setup

Description: A beginner-friendly guide to running ClickHouse on Docker Desktop for macOS and Windows, with tips for resource allocation and GUI client access.

---

Docker Desktop provides the simplest way to run ClickHouse locally on macOS or Windows without installing anything natively. This guide walks through running ClickHouse on Docker Desktop and connecting to it with a GUI client.

## Prerequisites

Download and install Docker Desktop from `https://www.docker.com/products/docker-desktop`. Ensure it is running before proceeding.

## Allocating Resources

ClickHouse benefits from sufficient memory. In Docker Desktop preferences:

1. Open **Settings** (gear icon)
2. Go to **Resources**
3. Set **Memory** to at least 4 GB (8 GB recommended)
4. Set **CPUs** to at least 2
5. Click **Apply and Restart**

## Running ClickHouse via Docker Desktop GUI

Open Docker Desktop and navigate to the search bar. Search for `clickhouse/clickhouse-server` and pull the latest image. Click **Run** and configure:

| Setting | Value |
|---------|-------|
| Container name | `clickhouse-local` |
| Port 8123 | `8123` |
| Port 9000 | `9000` |

## Running ClickHouse via Terminal

Alternatively, use the terminal (macOS Terminal or Windows PowerShell):

```bash
docker run -d \
  --name clickhouse-local \
  -p 8123:8123 \
  -p 9000:9000 \
  -v clickhouse_data:/var/lib/clickhouse \
  -e CLICKHOUSE_USER=admin \
  -e CLICKHOUSE_PASSWORD=admin123 \
  clickhouse/clickhouse-server:24.3
```

Verify it is running in Docker Desktop under the **Containers** tab.

## Testing the Connection

Open a terminal and run:

```bash
curl -u admin:admin123 'http://localhost:8123/?query=SELECT+version()'
```

Or access the interactive client:

```bash
docker exec -it clickhouse-local clickhouse-client \
  --user admin --password admin123
```

Test with a query:

```sql
SELECT
    name,
    total_space,
    free_space
FROM system.disks;
```

## Connecting with DBeaver (GUI Client)

DBeaver supports ClickHouse natively. After installing DBeaver:

1. Click **New Database Connection**
2. Search for **ClickHouse** and select it
3. Set **Host** to `localhost`, **Port** to `8123`
4. Enter username `admin` and password `admin123`
5. Click **Test Connection** and then **Finish**

## Using Docker Compose

You can define a reusable ClickHouse setup with Docker Compose and share it with your team via Git. Create a `compose.yaml` in your project root:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
volumes:
  clickhouse_data:
```

Start the service with:

```bash
docker compose up -d
```

Teammates can clone the repo and run the same command to get an identical ClickHouse environment.

## Stopping and Removing

In Docker Desktop, click the **Stop** icon next to the container. To remove the container and its data:

```bash
docker rm -f clickhouse-local
docker volume rm clickhouse_data
```

## Summary

Docker Desktop makes it trivially easy to run ClickHouse on macOS and Windows for local development. With proper resource allocation and a GUI client like DBeaver, you get a fully functional ClickHouse environment in minutes without any native installation.
