# How to Connect Airbyte to ClickHouse for Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Airbyte, Data Ingestion, ELT, Data Integration, ETL Pipeline

Description: A comprehensive guide to connecting Airbyte to ClickHouse for automated data ingestion from various sources including databases, APIs, and SaaS applications.

---

Airbyte is an open-source data integration platform that simplifies extracting data from various sources and loading it into ClickHouse. This guide covers setup, configuration, and best practices.

## Architecture Overview

```mermaid
graph LR
    subgraph Sources
        A[PostgreSQL]
        B[MySQL]
        C[Salesforce]
        D[Stripe API]
        E[S3 Files]
    end

    subgraph Airbyte
        F[Source Connectors]
        G[Typing and Deduping]
        H[Destination Connector]
    end

    subgraph ClickHouse
        I[Typed Destination Tables]
        J[Deduplicated Tables]
        K[Analytics Views]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
```

## Setting Up Airbyte

### Docker Installation

```bash
# Install abctl
curl -LsfS https://get.airbyte.com | bash -

# Start Airbyte
abctl local install

# View login credentials
abctl local credentials

# Access UI at http://localhost:8000
```

### Kubernetes Installation

```yaml
# airbyte-values.yaml
global:
  serviceAccountName: airbyte-admin
  edition: community
  jobs:
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"

webapp:
  enabled: true
  replicaCount: 1

server:
  replicaCount: 1

worker:
  replicaCount: 2

workloadLauncher:
  replicaCount: 1
```

```bash
helm repo add airbyte https://airbytehq.github.io/helm-charts
helm install airbyte airbyte/airbyte -f airbyte-values.yaml
```

## Configuring ClickHouse Destination

### Connection Settings

```json
{
  "host": "clickhouse.example.com",
  "port": "8443",
  "protocol": "https",
  "database": "analytics",
  "username": "airbyte_user",
  "password": "secure_password",
  "enable_json": true,
  "tunnel_method": {
    "tunnel_type": "NO_TUNNEL"
  }
}
```

### Create Airbyte User in ClickHouse

```sql
-- Create dedicated user for Airbyte
CREATE USER airbyte_user
IDENTIFIED BY 'secure_password'
SETTINGS max_execution_time = 3600;

ALTER USER airbyte_user SETTINGS async_insert = 0;

-- Grant necessary permissions
GRANT CREATE, CREATE TABLE, DROP TABLE, ALTER, TRUNCATE, INSERT, SELECT
ON analytics.*
TO airbyte_user;

-- Grant ability to create databases when namespaces map to ClickHouse databases
GRANT CREATE DATABASE ON *.* TO airbyte_user;
```

## Source Configuration Examples

### PostgreSQL Source

```json
{
  "host": "postgres.example.com",
  "port": 5432,
  "database": "production",
  "username": "readonly_user",
  "password": "password",
  "ssl_mode": {
    "mode": "require"
  },
  "replication_method": {
    "method": "CDC",
    "replication_slot": "airbyte_slot",
    "publication": "airbyte_publication"
  }
}
```

### MySQL Source with CDC

```json
{
  "host": "mysql.example.com",
  "port": 3306,
  "database": "app_db",
  "username": "replication_user",
  "password": "password",
  "replication_method": {
    "method": "CDC"
  },
  "server_timezone": "UTC"
}
```

### REST API Source

```json
{
  "api_url": "https://api.example.com/v1",
  "authentication": {
    "type": "oauth2",
    "client_id": "xxx",
    "client_secret": "xxx",
    "token_url": "https://api.example.com/oauth/token"
  },
  "streams": [
    {
      "name": "orders",
      "path": "/orders",
      "primary_key": "id",
      "incremental_field": "updated_at"
    }
  ]
}
```

## Sync Configuration

### Full Refresh Sync

```yaml
# Good for small reference tables
sync_mode: full_refresh
destination_sync_mode: overwrite

# ClickHouse table created
# customers with full data replaced each sync
```

### Incremental Sync with Deduplication

```yaml
# Best for large tables with updates
sync_mode: incremental
destination_sync_mode: append_dedup
cursor_field: updated_at
primary_key: [id]

# ClickHouse uses ReplacingMergeTree for deduplication;
# use FINAL in queries when you need merge-complete deduplicated results
```

## ClickHouse Table Optimization

### Custom Table Engines

```sql
-- Airbyte creates typed destination tables, you can create optimized copies
CREATE TABLE customers_optimized
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY customer_id
AS SELECT
    customer_id,
    email,
    name,
    created_at,
    updated_at
FROM customers;
```

### Materialized View for Real-time Processing

```sql
-- Process incoming Airbyte data in real-time
CREATE MATERIALIZED VIEW customers_mv
TO customers_final
AS SELECT
    customer_id,
    email,
    name,
    _airbyte_extracted_at AS synced_at
FROM customers
WHERE _airbyte_extracted_at > now() - INTERVAL 1 DAY;
```

## Scheduling and Orchestration

### Sync Schedule Configuration

```json
{
  "schedule_type": "cron",
  "cron_expression": "0 */6 * * *",
  "timezone": "UTC"
}
```

### Programmatic Sync via API

```python
import requests

AIRBYTE_API = "http://localhost:8000/api/public/v1"
ACCESS_TOKEN = "your-access-token"
HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

def trigger_sync(connection_id):
    response = requests.post(
        f"{AIRBYTE_API}/jobs",
        headers=HEADERS,
        json={"connectionId": connection_id, "jobType": "sync"}
    )
    response.raise_for_status()
    return response.json()

def check_sync_status(job_id):
    response = requests.get(f"{AIRBYTE_API}/jobs/{job_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()["status"]

# Trigger sync
result = trigger_sync("your-connection-id")
job_id = result["jobId"]
print(f"Sync job started: {job_id}")
```

## Monitoring and Alerts

### Sync Monitoring Query

```sql
-- Track freshness for a synced table
SELECT
    'customers' AS stream,
    max(_airbyte_extracted_at) AS last_sync,
    count() AS records_synced,
    dateDiff('minute', max(_airbyte_extracted_at), now()) AS minutes_since_sync
FROM customers;
```

### Data Freshness Alert

```sql
-- Alert if data is stale
SELECT
    'customers' AS stream,
    max(_airbyte_extracted_at) AS last_sync,
    CASE
        WHEN dateDiff('hour', max(_airbyte_extracted_at), now()) > 24
        THEN 'STALE'
        ELSE 'OK'
    END AS status
FROM customers;
```

## Troubleshooting

### Common Issues

```sql
-- Check for records with missing required fields
SELECT
    customer_id,
    email,
    _airbyte_extracted_at
FROM customers
WHERE customer_id IS NULL OR email = '';

-- Verify data completeness
SELECT
    toDate(_airbyte_extracted_at) AS sync_date,
    count() AS records,
    uniqExact(id) AS unique_ids
FROM orders
GROUP BY sync_date
ORDER BY sync_date DESC;
```

## Conclusion

Airbyte with ClickHouse provides:

1. **200+ connectors** for diverse data sources
2. **CDC support** for real-time data replication
3. **Incremental syncs** for efficient data loading
4. **Typing and deduping** for structured data
5. **Open-source flexibility** with cloud option

Use Airbyte to build reliable data pipelines that feed your ClickHouse analytics platform.
