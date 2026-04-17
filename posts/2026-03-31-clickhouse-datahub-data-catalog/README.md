# How to Use ClickHouse with Datahub for Data Catalog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DataHub, Data Catalog, Data Governance, Metadata

Description: Integrate ClickHouse with DataHub to catalog your tables, track column-level lineage, and enable data discovery across your organization.

---

## Why a Data Catalog Matters

As your ClickHouse usage grows, teams struggle to discover what data exists, who owns it, and how it flows between tables. A data catalog like DataHub solves this by providing a searchable inventory of all tables, columns, and their lineage.

## DataHub Architecture with ClickHouse

```text
ClickHouse ---> DataHub Ingestion (clickhouse recipe) ---> DataHub Metadata Store
                                                                   |
                                                            DataHub UI (search, lineage, docs)
```

## Setting Up DataHub Ingestion for ClickHouse

Install the DataHub CLI:

```bash
pip install 'acryl-datahub[clickhouse]'
```

Create an ingestion recipe (`clickhouse_recipe.yml`):

```text
source:
  type: clickhouse
  config:
    host_port: ch.internal:8123
    database: analytics
    username: datahub_reader
    password: "${CH_PASSWORD}"
    include_tables: true
    include_views: true
    include_table_lineage: true
    include_view_column_lineage: true
    profile_pattern:
      allow:
        - "analytics.*"

sink:
  type: datahub-rest
  config:
    server: http://datahub-gms:8080
```

## Running the Ingestion

```bash
datahub ingest -c clickhouse_recipe.yml
```

DataHub discovers all tables, columns, types, and statistics. Schedule this to run daily:

```bash
# /etc/cron.d/datahub-clickhouse
0 6 * * * datahub_user datahub ingest -c /opt/datahub/clickhouse_recipe.yml >> /var/log/datahub_ingest.log 2>&1
```

## Adding Business Metadata

Enrich tables with owners, descriptions, and tags in the DataHub UI or via the CLI. The `datahub dataset upsert` command reads metadata from a YAML file:

```text
# orders_dataset.yml
- id: analytics.orders
  platform: clickhouse
  env: PROD
  description: "Production orders table containing all completed and pending orders"
  tags:
    - critical
    - revenue
    - orders
  owners:
    - alice
```

Apply it with:

```bash
datahub dataset upsert -f orders_dataset.yml
```

## Column-Level Lineage

DataHub can track which source columns feed into derived columns in materialized views. ClickHouse's system tables provide query history that DataHub parses for lineage:

```sql
-- DataHub reads from system.query_log to trace lineage
SELECT query, databases, tables
FROM system.query_log
WHERE type = 'QueryFinish'
  AND has(databases, 'analytics')
  AND query_start_time >= now() - INTERVAL 7 DAY
LIMIT 1000;
```

## Enabling Self-Service Data Discovery

Once indexed, teams can search DataHub for:
- "Show me all tables owned by the payments team"
- "What tables depend on analytics.orders?"
- "Which columns contain PII?"

Tag PII columns by upserting dataset metadata that includes schema-level tags:

```text
# users_dataset.yml
- id: analytics.users
  platform: clickhouse
  env: PROD
  schema:
    fields:
      - id: email
        tags:
          - PII
          - sensitive
      - id: phone
        tags:
          - PII
```

## Summary

DataHub with ClickHouse provides a centralized data catalog that indexes table schemas, ownership, descriptions, and lineage - enabling self-service data discovery and governance as your ClickHouse usage scales across teams.
