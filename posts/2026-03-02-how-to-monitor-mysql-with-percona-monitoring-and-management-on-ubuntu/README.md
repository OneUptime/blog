# How to Monitor MySQL with Percona Monitoring and Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Monitoring, Percona, Database

Description: Set up Percona Monitoring and Management (PMM) on Ubuntu to get deep visibility into MySQL performance, query analytics, and system metrics.

---

MySQL performance issues have a way of hiding until they become urgent. Slow queries, lock contention, buffer pool pressure - these problems often build gradually before they cause visible slowdowns. Percona Monitoring and Management (PMM) gives you the observability tooling to catch these problems early, with dashboards built specifically for MySQL internals rather than generic host metrics.

This walkthrough covers deploying PMM Server as a Docker container and installing PMM Client on your Ubuntu MySQL hosts.

## Prerequisites

- Ubuntu 20.04 or 22.04
- MySQL 5.7 or 8.0 running on the monitored host
- Docker installed on the server where PMM Server will run
- A user with sudo privileges on both machines

## Installing PMM Server

PMM Server runs as a Docker container. Pull and start it with a named volume for persistent storage:

```bash
# Pull the latest PMM Server image
docker pull percona/pmm-server:2

# Create a volume for persistent data
docker volume create pmm-data

# Start PMM Server
docker run -d \
  --name pmm-server \
  --restart always \
  -p 443:443 \
  -p 80:80 \
  -v pmm-data:/srv \
  percona/pmm-server:2
```

After the container starts, wait about 30 seconds for initialization, then access the PMM web UI at `https://your-server-ip`. The default credentials are `admin` / `admin`. You will be prompted to change the password on first login.

### Checking PMM Server Health

```bash
# Verify the container is running
docker ps | grep pmm-server

# Check container logs for errors
docker logs pmm-server --tail 50
```

## Installing PMM Client on Ubuntu

On each MySQL host you want to monitor, install the PMM Client package:

```bash
# Download and install the Percona repository package
wget https://repo.percona.com/apt/percona-release_latest.$(lsb_release -sc)_all.deb
sudo dpkg -i percona-release_latest.$(lsb_release -sc)_all.deb

# Update package lists
sudo apt update

# Install PMM Client
sudo apt install -y pmm2-client
```

### Registering the Client with PMM Server

```bash
# Register this host with your PMM Server
# Replace the IP and password with your actual values
sudo pmm-admin config \
  --server-insecure-tls \
  --server-url=https://admin:your_password@pmm-server-ip:443
```

Verify the connection was successful:

```bash
sudo pmm-admin status
```

You should see output showing the agent is connected and running.

## Configuring MySQL for Monitoring

PMM needs a dedicated MySQL user with specific privileges to collect metrics and query analytics data.

```sql
-- Connect to MySQL as root and create the PMM user
CREATE USER 'pmm'@'localhost' IDENTIFIED BY 'strong_password_here' WITH MAX_USER_CONNECTIONS 10;

-- Grant the necessary privileges for metrics collection
GRANT SELECT, PROCESS, REPLICATION CLIENT, RELOAD, BACKUP_ADMIN ON *.* TO 'pmm'@'localhost';

-- For Performance Schema access (query analytics)
GRANT SELECT ON performance_schema.* TO 'pmm'@'localhost';

FLUSH PRIVILEGES;
```

### Enabling Performance Schema

Query analytics relies on Performance Schema being enabled and configured correctly. Check the current state:

```sql
-- Verify Performance Schema is enabled
SHOW VARIABLES LIKE 'performance_schema';

-- Check which statement consumers are enabled
SELECT * FROM performance_schema.setup_consumers WHERE NAME LIKE '%statements%';
```

If Performance Schema is off, enable it by adding to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
performance_schema = ON
performance-schema-instrument = 'statement/sql/%=ON'
performance-schema-consumer-events-statements-history-long = ON
```

Restart MySQL after making these changes:

```bash
sudo systemctl restart mysql
```

## Adding MySQL to PMM Monitoring

With the MySQL user created and Performance Schema enabled, register the MySQL instance with PMM Client:

```bash
# Add MySQL monitoring with query analytics
sudo pmm-admin add mysql \
  --username=pmm \
  --password=strong_password_here \
  --query-source=perfschema \
  --service-name=mysql-production
```

Verify the service was added:

```bash
sudo pmm-admin list
```

The output should show your MySQL service with status "Running".

## Understanding the PMM Dashboards

Once data starts flowing (typically within a minute), you will find several MySQL-specific dashboards in the PMM UI:

### MySQL Overview

The overview dashboard shows top-level indicators: queries per second, connections, InnoDB buffer pool usage, and thread activity. Watch the "MySQL Connections" panel - if you see connections approaching `max_connections`, you need to investigate connection pooling or increase the limit.

### MySQL Query Analytics

This is where PMM becomes genuinely valuable. The QAN (Query Analytics) section shows you:

- Top queries by execution time
- Queries with high lock time
- Full query text and execution plan
- Per-query metrics over time

To view slow queries in QAN:

1. Navigate to PMM Query Analytics in the left menu
2. Filter by your service name
3. Sort by "Load" to find queries consuming the most total time

### MySQL InnoDB Metrics

The InnoDB dashboard tracks buffer pool hit rate, redo log usage, and row operations. A buffer pool hit rate below 99% is worth investigating - it means MySQL is reading from disk rather than memory.

## Setting Up Alerting

PMM includes Alertmanager for sending notifications when metrics cross thresholds.

```bash
# Access the alert rules through the PMM UI
# Navigate to Alerting > Alert Rules in the sidebar

# Alternatively, configure via the API
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:your_password \
  https://pmm-server-ip/alertmanager/api/v1/alerts \
  -d '[{
    "labels": {
      "alertname": "MySQLHighConnections",
      "severity": "warning"
    }
  }]'
```

PMM ships with pre-built alert templates for common MySQL issues including high connection count, replication lag, and InnoDB lock waits.

## Monitoring MySQL Replication

If you run MySQL replication, PMM automatically detects replica status and shows replication lag on dedicated dashboards. Add monitoring to both primary and replica servers:

```bash
# On the replica server, register with PMM
sudo pmm-admin config \
  --server-insecure-tls \
  --server-url=https://admin:your_password@pmm-server-ip:443

# Add the replica MySQL instance
sudo pmm-admin add mysql \
  --username=pmm \
  --password=strong_password_here \
  --query-source=perfschema \
  --service-name=mysql-replica-01
```

The "MySQL Replication" dashboard will automatically show replication lag, relay log position, and replica thread status.

## Keeping PMM Updated

Updating PMM Server is straightforward with Docker:

```bash
# Pull the latest image
docker pull percona/pmm-server:2

# Stop and remove the current container
docker stop pmm-server
docker rm pmm-server

# Start with the same volume (data is preserved)
docker run -d \
  --name pmm-server \
  --restart always \
  -p 443:443 \
  -p 80:80 \
  -v pmm-data:/srv \
  percona/pmm-server:2
```

For PMM Client on Ubuntu:

```bash
sudo apt update && sudo apt upgrade -y pmm2-client
```

## Troubleshooting Common Issues

If metrics are not appearing in PMM, check the agent status:

```bash
# Check agent logs
sudo journalctl -u pmm-agent -n 100

# Restart the PMM agent
sudo systemctl restart pmm-agent

# Verify MySQL connectivity from the client
mysql -u pmm -p -h 127.0.0.1 -e "SELECT 1;"
```

If the PMM UI shows the service as disconnected, verify network connectivity between the client and server on ports 80 and 443.

PMM is one of the more complete MySQL observability solutions available without a commercial license. The query analytics alone makes it worth running - being able to identify the exact queries driving load is far more actionable than generic host metrics.
