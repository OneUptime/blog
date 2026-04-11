# How to Monitor MySQL with New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, New Relic, Monitoring, Metric, Dashboard

Description: Configure the New Relic Infrastructure Agent MySQL integration to collect metrics, slow queries, and replication status from MySQL into New Relic dashboards.

---

## Installing the New Relic Infrastructure Agent

Install the agent on the MySQL host:

```bash
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash
sudo NEW_RELIC_API_KEY=<API_KEY> NEW_RELIC_ACCOUNT_ID=<ACCOUNT_ID> \
  /usr/local/bin/newrelic install -n infrastructure-agent-installer
```

## Creating the MySQL Monitoring User

```sql
CREATE USER 'newrelic'@'localhost' IDENTIFIED BY 'newrelic_secret';
GRANT REPLICATION CLIENT ON *.* TO 'newrelic'@'localhost';
GRANT PROCESS ON *.* TO 'newrelic'@'localhost';
GRANT SELECT ON performance_schema.* TO 'newrelic'@'localhost';
FLUSH PRIVILEGES;
```

## Installing the MySQL Integration

```bash
sudo apt-get install -y nri-mysql
```

## Configuring the MySQL Integration

Create `/etc/newrelic-infra/integrations.d/mysql-config.yml`:

```yaml
integrations:
  - name: nri-mysql
    env:
      HOSTNAME: localhost
      PORT: 3306
      USERNAME: newrelic
      PASSWORD: newrelic_secret
      DATABASE: ""
      REMOTE_MONITORING: true
      EXTENDED_METRICS: true
      EXTENDED_INNODB_METRICS: true
      EXTENDED_MY_ISAM_METRICS: false
    interval: 30s
    labels:
      environment: production
      role: mysql-primary
    inventory_source: config/mysql
```

Restart the agent:

```bash
sudo systemctl restart newrelic-infra
```

## Verifying Data in New Relic

Navigate to New Relic One > Infrastructure > Third-party services > MySQL. You should see your MySQL entity appear within a few minutes.

Run a NRQL query to confirm metrics are flowing:

```sql
SELECT average(query.queriesPerSecond)
FROM MysqlSample
FACET hostname
SINCE 30 MINUTES AGO
TIMESERIES
```

## Creating an Alert Policy

Use NRQL alert conditions to page your team when critical thresholds are crossed:

```sql
-- Alert when replication lag exceeds 30 seconds
SELECT latest(cluster.secondsBehindMaster)
FROM MysqlSample
WHERE hostname = 'replica1.db.local'
```

Set a threshold of `> 30` with a 2-minute evaluation window and attach it to a notification channel (email, PagerDuty, Slack).

## Key Metrics Available

```text
query.queriesPerSecond             - queries per second
net.threadsConnected               - active connections
db.innodb.bufferPoolPagesTotal     - buffer pool utilization
cluster.secondsBehindMaster        - replication lag
query.slowQueriesPerSecond         - slow query rate
```

## Using the MySQL Quickstart Dashboard

In New Relic One, search for "MySQL" in the Instant Observability catalog and click "Install". This deploys a pre-built dashboard with panels for throughput, latency, connections, InnoDB metrics, and replication - saving you the time of building from scratch.

## Summary

The New Relic MySQL integration collects performance metrics, InnoDB stats, and replication lag via a minimal-privilege user and a YAML configuration file. Enable `EXTENDED_INNODB_METRICS` for deeper storage engine visibility, verify data with NRQL, and use NRQL alert conditions to detect replication lag, connection exhaustion, and slow query spikes before they impact users.
