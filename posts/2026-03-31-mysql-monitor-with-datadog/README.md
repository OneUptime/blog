# How to Monitor MySQL with Datadog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Datadog, Monitoring, Metric, Dashboard

Description: Set up the Datadog Agent MySQL integration to collect metrics, query performance data, and replication status from MySQL and visualize them in Datadog dashboards.

---

## Installing the Datadog Agent

Install the Datadog Agent on the MySQL host:

```bash
DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" \
  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
```

## Creating the Datadog MySQL User

```sql
CREATE USER 'datadog'@'localhost' IDENTIFIED BY 'datadog_secret';
GRANT REPLICATION CLIENT ON *.* TO 'datadog'@'localhost';
GRANT PROCESS ON *.* TO 'datadog'@'localhost';
GRANT SELECT ON performance_schema.* TO 'datadog'@'localhost';
FLUSH PRIVILEGES;
```

## Configuring the MySQL Integration

Create `/etc/datadog-agent/conf.d/mysql.d/conf.yaml`:

```yaml
init_config:

instances:
  - host: 127.0.0.1
    port: 3306
    username: datadog
    password: datadog_secret
    options:
      replication: true
      galera_cluster: false
      extra_status_metrics: true
      extra_innodb_metrics: true
      extra_performance_metrics: true
      schema_size_metrics: true
      disable_innodb_metrics: false
```

Restart the agent:

```bash
sudo systemctl restart datadog-agent
```

Verify the check:

```bash
sudo datadog-agent check mysql
```

## Enabling Database Monitoring

Datadog's Database Monitoring (DBM) feature collects individual query samples, explain plans, and wait events. Enable it by adding to `conf.yaml`:

```yaml
instances:
  - host: 127.0.0.1
    port: 3306
    username: datadog
    password: datadog_secret
    dbm: true
    collect_settings:
      collection_interval: 600
    query_activity:
      enabled: true
      collection_interval: 10
    query_metrics:
      enabled: true
      collection_interval: 10
```

Grant the additional permissions DBM requires:

```sql
GRANT SELECT ON *.* TO 'datadog'@'localhost';
GRANT SHOW DATABASES ON *.* TO 'datadog'@'localhost';
UPDATE performance_schema.setup_consumers
SET enabled='YES'
WHERE name LIKE '%events_statements%';
```

## Key Metrics to Alert On

Once data is flowing, create Datadog monitors for these metrics:

```text
mysql.net.connections          - active connections
mysql.performance.threads_running - threads executing queries
mysql.replication.seconds_behind_master - replication lag
mysql.innodb.buffer_pool_free      - buffer pool pressure
mysql.performance.slow_queries - slow query rate
```

## Using the Out-of-the-Box Dashboard

Navigate to Integrations > MySQL in Datadog to enable the integration dashboard. It includes panels for query throughput, InnoDB metrics, connection counts, and replication lag out of the box.

## Summary

The Datadog MySQL integration requires a minimal-privilege user and a single YAML configuration file. Enable `extra_innodb_metrics` and `extra_performance_metrics` for deeper visibility, and turn on Database Monitoring to get per-query explain plans and wait event analysis. Use the built-in MySQL dashboard as a starting point and add custom monitors for connections, replication lag, and slow query rates to get alerted before issues escalate.
