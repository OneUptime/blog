# What Is Percona Monitoring and Management (PMM) for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Percona Pmm, Monitoring, Observability

Description: Percona Monitoring and Management (PMM) is an open-source platform for monitoring MySQL performance metrics, query analytics, and alerting in real time.

---

## Overview

Percona Monitoring and Management (PMM) is a free, open-source observability platform purpose-built for MySQL, MongoDB, and PostgreSQL. It provides detailed dashboards for server performance, query-level analytics, alerting, and advisors that surface configuration issues.

PMM consists of two components:
- **PMM Server** - the monitoring backend with Grafana dashboards, VictoriaMetrics metrics storage, and Query Analytics (QAN)
- **PMM Client** - a lightweight agent installed on each database host that collects and sends metrics

## Architecture

```text
[MySQL Host]                    [PMM Server]
  pmm-client                      Grafana Dashboards
  mysqld_exporter  ---metrics--->  VictoriaMetrics
  node_exporter                    Query Analytics (QAN)
                                   Alertmanager
```

## Installing PMM Server with Docker

```bash
# Pull and start PMM Server
docker pull percona/pmm-server:2

docker run -d   --name pmm-server   -p 443:443   -p 80:80   percona/pmm-server:2

# Access at https://your-server-ip
# Default credentials: admin / admin
```

## Installing PMM Client

```bash
# Ubuntu/Debian
wget https://downloads.percona.com/downloads/pmm2/2.41.0/binary/debian/jammy/x86_64/pmm2-client_2.41.0-6.jammy_amd64.deb
sudo dpkg -i pmm2-client_2.41.0-6.jammy_amd64.deb

# Or via Percona repository
sudo percona-release enable-only pmm2-client release
sudo apt-get install pmm2-client
```

## Configuring PMM Client

```bash
# Register the PMM client with the server
sudo pmm-admin config   --server-insecure-tls   --server-url=https://admin:admin@pmm-server-host:443
```

## Creating the MySQL Monitoring User

```sql
CREATE USER 'pmm'@'localhost' IDENTIFIED BY 'pmm_password' WITH MAX_USER_CONNECTIONS 10;
GRANT SELECT, PROCESS, REPLICATION CLIENT, RELOAD ON *.* TO 'pmm'@'localhost';
GRANT SELECT, UPDATE, DELETE, DROP ON performance_schema.* TO 'pmm'@'localhost';
```

## Adding MySQL to PMM Monitoring

```bash
# Add MySQL service to monitoring
sudo pmm-admin add mysql   --username=pmm   --password=pmm_password   --service-name=prod-mysql-01   --host=localhost   --port=3306   --query-source=perfschema

# Verify monitoring is active
sudo pmm-admin list
```

## Key PMM Dashboards

Once connected, PMM provides these key dashboards:

- **MySQL Overview** - connections, queries per second, buffer pool hit rate
- **MySQL InnoDB Metrics** - redo log, row operations, MVCC
- **MySQL Query Analytics (QAN)** - top queries by load, latency, calls
- **MySQL Replication** - replication lag, GTID positions
- **MySQL Table Details** - per-table I/O, row counts

## Query Analytics (QAN)

QAN shows the top queries consuming server resources:

```text
Query           | Load  | Latency | Count | Rows Examined
----------------|-------|---------|-------|---------------
SELECT * FROM.. | 45.2% | 1.23s   | 12K   | 500M
UPDATE orders.. | 22.1% | 0.45s   | 45K   | 2M
```

Click any query for details including:
- Example query with real parameter values
- EXPLAIN output
- Query time histogram
- Table and index information

## Configuring Slow Query Log Integration

```text
[mysqld]
slow_query_log = 1
long_query_time = 0
log_slow_admin_statements = 1
log_slow_slave_statements = 1
```

```bash
sudo pmm-admin add mysql --query-source=slowlog
```

## Summary

Percona PMM is a comprehensive MySQL monitoring platform that combines VictoriaMetrics-based metrics storage with deep query analytics. Its Query Analytics feature makes it straightforward to identify the top queries consuming database resources, while its pre-built dashboards and alerting rules provide immediate visibility into MySQL health. PMM is the recommended monitoring solution for production MySQL deployments.
