# How to Monitor MySQL with Percona Monitoring and Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, PMM, Percona, Monitoring, Query Analytics

Description: Deploy Percona Monitoring and Management (PMM) to monitor MySQL performance, analyze slow queries, and visualize database metrics with built-in dashboards.

---

## What is PMM?

Percona Monitoring and Management (PMM) is an open-source platform for database monitoring built on Prometheus, Grafana, and Percona's query analytics engine. It provides:
- Pre-built MySQL dashboards
- Query Analytics (QAN) with execution plan analysis
- Advisor checks for configuration issues
- Built-in alerting

## PMM Architecture

```text
[PMM Client] --> [PMM Server]
    |                |
[MySQL]         [Grafana + Prometheus + QAN]
```

## Deploying PMM Server with Docker

```bash
# Create a persistent data volume
docker volume create pmm-data

# Run PMM Server
docker run -d \
  --name pmm-server \
  -p 443:443 \
  -p 80:80 \
  -v pmm-data:/srv \
  --restart always \
  percona/pmm-server:2
```

Access the PMM UI at `https://localhost` (default credentials: admin/admin).

## Installing PMM Client on MySQL Servers

```bash
# On Ubuntu/Debian
wget https://repo.percona.com/apt/percona-release_latest.generic_all.deb
dpkg -i percona-release_latest.generic_all.deb
apt-get update && apt-get install pmm2-client

# On RHEL/CentOS
yum install https://repo.percona.com/yum/percona-release-latest.noarch.rpm
yum install pmm2-client
```

## Registering PMM Client with PMM Server

```bash
pmm-admin config \
  --server-insecure-tls \
  --server-url=https://admin:admin@pmm-server-ip
```

## Creating the MySQL PMM User

```sql
CREATE USER 'pmm'@'127.0.0.1' IDENTIFIED BY 'PMM_password1' WITH MAX_USER_CONNECTIONS 10;
GRANT SELECT, PROCESS, SUPER, REPLICATION CLIENT, RELOAD ON *.* TO 'pmm'@'127.0.0.1';
GRANT SELECT, UPDATE, DELETE, DROP ON performance_schema.* TO 'pmm'@'127.0.0.1';
```

## Adding MySQL Service to PMM

```bash
pmm-admin add mysql \
  --username=pmm \
  --password=PMM_password1 \
  --service-name=mysql-prod-01 \
  --host=127.0.0.1 \
  --port=3306 \
  --query-source=perfschema
```

Verify the service is registered:

```bash
pmm-admin list
```

## Enabling Performance Schema for Query Analytics

PMM can use either `slowlog` or Performance Schema as the query source.

For Performance Schema:

```sql
-- Verify Performance Schema is enabled
SHOW VARIABLES LIKE 'performance_schema';

-- Enable key consumers
UPDATE performance_schema.setup_consumers
SET enabled='YES'
WHERE name IN ('events_statements_current', 'events_statements_history', 'events_statements_history_long');

UPDATE performance_schema.setup_instruments
SET enabled='YES', timed='YES'
WHERE name LIKE 'statement/%';
```

For slow log (alternative):

```bash
pmm-admin add mysql \
  --username=pmm \
  --password=PMM_password1 \
  --service-name=mysql-prod-01 \
  --query-source=slowlog
```

## Key PMM Dashboards

Navigate to these dashboards in Grafana:

| Dashboard | Path |
|-----------|------|
| MySQL Overview | PMM / MySQL / MySQL Overview |
| InnoDB Details | PMM / MySQL / MySQL InnoDB Details |
| Replication Summary | PMM / MySQL / MySQL Replication Summary |
| Query Analytics | PMM / Query Analytics |

## Using Query Analytics

Query Analytics (QAN) shows the top queries by:
- Load (query time x calls)
- Latency (average execution time)
- Calls per second

```text
# Sample QAN output
Query: SELECT * FROM orders WHERE customer_id = ?
Calls: 15,234/min
Avg latency: 45ms
P99 latency: 230ms
Rows examined: 45,123
```

Click any query to see EXPLAIN output and full execution statistics.

## Enabling Advisors

PMM Advisors check for common configuration issues:

```bash
# View advisor checks via API
curl -u admin:admin https://pmm-server-ip/v1/advisors/checks
```

Common advisor checks include:
- Buffer pool size relative to data size
- Missing indexes on high-load queries
- Replication lag thresholds

## Summary

PMM provides a comprehensive MySQL monitoring platform by deploying a PMM Server (via Docker) and PMM Client agents on each MySQL host. After adding MySQL services with `pmm-admin add mysql`, the platform offers pre-built Grafana dashboards, Query Analytics for identifying slow queries with execution plans, and Advisor checks for automated configuration recommendations.
