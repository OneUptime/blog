# How to Create Redis Dashboards in Kibana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kibana, Dashboard, Monitoring, Elasticsearch

Description: Learn how to create Redis monitoring dashboards in Kibana using Metricbeat - covering setup, key visualizations, and building a comprehensive Redis health dashboard.

---

Kibana provides powerful dashboard capabilities for Redis monitoring when combined with Metricbeat. The Metricbeat Redis module collects server metrics and ships them to Elasticsearch, where Kibana can visualize them in real-time dashboards.

## Install and Configure Metricbeat

Install Metricbeat on the Redis server:

```bash
# Ubuntu/Debian
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
sudo apt-get install apt-transport-https
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update && sudo apt-get install metricbeat
```

Enable and configure the Redis module:

```bash
metricbeat modules enable redis
```

```yaml
# /etc/metricbeat/modules.d/redis.yml
- module: redis
  metricsets:
    - info
    - keyspace
  period: 10s
  hosts: ["localhost:6379"]
  password: ""
```

Configure Elasticsearch output:

```yaml
# /etc/metricbeat/metricbeat.yml
output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  username: "elastic"
  password: "${ES_PASSWORD}"

setup.kibana:
  host: "https://kibana:5601"
```

## Load Pre-Built Redis Dashboards

Metricbeat includes pre-built Redis dashboards:

```bash
metricbeat setup --dashboards
systemctl enable metricbeat
systemctl start metricbeat
```

In Kibana, go to Dashboards and search for "Redis" to find the pre-built dashboard with memory, connections, and command rate panels.

## Key Metrics to Visualize

Build your dashboard around these Metricbeat Redis fields:

```text
redis.info.memory.used.value          - Memory in bytes
redis.info.clients.connected          - Connected clients
redis.info.stats.keyspace.hits        - Cache hits
redis.info.stats.keyspace.misses      - Cache misses
redis.info.stats.instantaneous.ops_per_sec - Commands/sec
redis.info.persistence.rdb.bgsave.last_status - RDB status
redis.info.replication.master.offset  - Replication offset
```

## Create a Cache Hit Rate Visualization

In Kibana Lens:

```text
1. Create New Visualization > Lens
2. Choose "Line" chart type
3. X-axis: @timestamp (Date histogram, 1 minute interval)
4. Y-axis: Formula
   Formula:
   counter_rate(max(redis.info.stats.keyspace.hits)) /
   (counter_rate(max(redis.info.stats.keyspace.hits)) + counter_rate(max(redis.info.stats.keyspace.misses))) * 100
5. Label: "Cache Hit Rate %"
```

## Create a Memory Usage Panel

```text
1. Create New Visualization > Gauge
2. Metric: Max(redis.info.memory.used.value)
3. Color ranges:
   - Green: 0 to 2GB
   - Yellow: 2GB to 3.5GB
   - Red: 3.5GB and above
4. Title: "Redis Memory Used"
```

## Create an OOTB Alerts Using Kibana Rules

Set up automatic alerts from Kibana:

```text
Stack Management > Rules > Create Rule

Rule type: Elasticsearch Query
Name: Redis High Memory Alert

KQL Query:
redis.info.memory.used.value > 3500000000

Schedule: Every 1 minute
Alert condition: Query returns results

Action: Send email or Slack webhook
```

## Build the Final Dashboard Layout

Organize your panels logically:

```text
Row 1: Key indicators (single stat panels)
  - Memory Used | Cache Hit Rate | Connected Clients | Ops/sec

Row 2: Time series charts
  - Memory Usage Over Time
  - Cache Hit Rate Over Time
  - Commands Per Second

Row 3: Status indicators
  - RDB Last Save Status
  - Replication Lag
  - Keyspace Size by DB
```

## Summary

Kibana Redis dashboards require Metricbeat for data collection and Elasticsearch for storage. Load the pre-built dashboards as a starting point, then customize with Lens visualizations for your specific metrics like cache hit rate and memory usage trends. Use Kibana Rules to trigger alerts when Redis metrics cross critical thresholds, giving your team automatic notification of issues.
