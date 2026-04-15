# How to Build a Self-Hosted Analytics Platform with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Self-Hosted, Analytics Platform, Grafana, Open Source

Description: Build a self-hosted analytics platform with ClickHouse, Grafana, and dbt to replace expensive SaaS analytics tools while retaining full data control.

---

## Why Self-Host Analytics

SaaS analytics platforms like Mixpanel, Amplitude, or Looker can cost tens of thousands of dollars per month at scale. A self-hosted ClickHouse-based platform gives you:

- Full control over your data
- No per-event or per-seat pricing
- SQL-first analytics your engineers already know
- Ability to join product data with your entire data model

## Platform Components

| Component | Purpose | Tool |
|-----------|---------|------|
| Event ingestion | Collect user events | Vector or custom HTTP endpoint |
| Storage | Analytical database | ClickHouse |
| Transformation | Build metrics models | dbt |
| Visualization | Dashboards | Grafana |
| Alerting | Anomaly notification | OneUptime or Grafana alerts |

## Event Tracking Schema

```sql
CREATE TABLE analytics.events (
    event_time   DateTime64(3),
    user_id      UInt64,
    anonymous_id String,
    session_id   String,
    event_name   LowCardinality(String),
    page_url     String,
    referrer     String,
    device_type  LowCardinality(String),
    country      LowCardinality(String),
    properties   Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time)
TTL toDate(event_time) + INTERVAL 2 YEAR DELETE;
```

## Event Ingestion API

A lightweight HTTP endpoint accepts events and batches them into ClickHouse:

```bash
curl -X POST https://analytics.yourcompany.com/event \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "page_view",
    "user_id": 42,
    "page_url": "/pricing",
    "device_type": "desktop"
  }'
```

## Building Metrics with dbt

Use dbt to define reusable metrics on top of ClickHouse:

```text
-- models/metrics/daily_active_users.sql
SELECT
    toDate(event_time) AS date,
    count(DISTINCT user_id) AS dau
FROM {{ ref('events') }}
WHERE event_name != 'session_start'
  AND toDate(event_time) >= today() - INTERVAL 90 DAY
GROUP BY date
ORDER BY date
```

## Grafana Dashboard Configuration

Install the ClickHouse data source plugin and create a funnel chart:

```sql
SELECT
    event_name,
    users,
    users / max(users) OVER () * 100 AS pct
FROM (
    SELECT
        event_name,
        count(DISTINCT user_id) AS users
    FROM events
    WHERE event_time >= now() - INTERVAL 7 DAY
      AND event_name IN ('signup_start', 'email_verified', 'onboarding_complete', 'first_purchase')
    GROUP BY event_name
) AS funnel
ORDER BY users DESC;
```

## Deploying on Kubernetes

Run ClickHouse as a StatefulSet with persistent volumes and expose it internally:

```bash
helm repo add clickhouse-operator https://docs.altinity.com/clickhouse-operator/
helm install clickhouse-operator clickhouse-operator/altinity-clickhouse-operator \
  --namespace analytics --create-namespace
```

## Summary

A self-hosted analytics platform built on ClickHouse, dbt, and Grafana delivers production-grade product analytics capabilities at a fraction of SaaS costs, with full data ownership and the flexibility to extend the model to any business need.
