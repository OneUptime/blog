# How to Set Up ClickHouse Dev Environment with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Development, Local Setup, Dev Environment, Docker Compose

Description: Set up a complete ClickHouse development environment with Docker including sample data, a SQL client, and optional Grafana for visualization.

---

A well-configured local ClickHouse development environment speeds up iteration and lets you safely experiment with schemas and queries without risk to production data. This guide builds a complete dev stack using Docker Compose.

## What We Will Build

- ClickHouse server with persistent storage
- Sample data loaded on startup
- Optional Grafana for dashboard development

## docker-compose.yml

```yaml
version: "3.8"

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    container_name: ch-dev
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ch_dev_data:/var/lib/clickhouse
      - ./init:/docker-entrypoint-initdb.d
      - ./config:/etc/clickhouse-server/config.d
    environment:
      CLICKHOUSE_USER: dev
      CLICKHOUSE_PASSWORD: devpass
      CLICKHOUSE_DB: dev_db
    healthcheck:
      test: ["CMD", "clickhouse-client", "--user", "dev", "--password", "devpass", "--query", "SELECT 1"]
      interval: 10s
      retries: 5

  grafana:
    image: grafana/grafana:10.4.0
    container_name: grafana-dev
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    depends_on:
      - clickhouse

volumes:
  ch_dev_data:
```

## Sample Data Initialization

Create `init/01_sample_data.sql`:

```sql
CREATE DATABASE IF NOT EXISTS dev_db;

CREATE TABLE IF NOT EXISTS dev_db.orders (
    order_id    UUID DEFAULT generateUUIDv4(),
    customer_id UInt32,
    product     String,
    amount      Decimal(10, 2),
    status      LowCardinality(String),
    created_at  DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, customer_id);

INSERT INTO dev_db.orders (customer_id, product, amount, status) VALUES
    (1, 'Widget A', 29.99, 'completed'),
    (2, 'Widget B', 49.99, 'pending'),
    (3, 'Widget C', 9.99, 'completed'),
    (1, 'Widget D', 99.99, 'shipped');
```

## Starting the Dev Environment

```bash
docker compose up -d
docker compose logs -f clickhouse
```

Wait until you see `Ready for connections` in the logs.

## Connecting to the Dev Instance

Via the ClickHouse client:

```bash
docker exec -it ch-dev clickhouse-client \
  --user dev --password devpass --database dev_db
```

Run some queries to verify data:

```sql
SELECT status, count() AS cnt, sum(amount) AS total
FROM orders
GROUP BY status
ORDER BY total DESC;
```

## Grafana Setup

Open Grafana at `http://localhost:3000` (admin/admin). Install the ClickHouse data source plugin:

```bash
docker exec -it grafana-dev grafana-cli plugins install grafana-clickhouse-datasource
docker compose restart grafana
```

Configure the data source with host `clickhouse`, port `9000`, user `dev`, password `devpass`.

## Useful Dev Shortcuts

```bash
# Access clickhouse-client quickly
alias chdev='docker exec -it ch-dev clickhouse-client --user dev --password devpass'

# Tail ClickHouse logs
docker compose logs -f clickhouse

# Reset data completely
docker compose down -v && docker compose up -d
```

## Summary

This Docker-based ClickHouse dev environment provides everything needed for local development: a persistent ClickHouse instance with sample data, a visualization layer via Grafana, and easy client access. The setup is fully reproducible and can be version-controlled alongside your application code.
