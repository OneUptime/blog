# How to Create a Container Metrics Dashboard in Grafana via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, cAdvisor, Container Metrics, Dashboard

Description: Learn how to build a Grafana dashboard showing per-container CPU, memory, and network metrics sourced from cAdvisor, deployed and managed via Portainer.

## Prerequisites

- Prometheus + Grafana + cAdvisor stack running (see prometheus-grafana-portainer guide)
- Grafana accessible at `http://server:3000`
- Prometheus reachable from Grafana

## Step 1: Add Prometheus Data Source

In Grafana: **Connections → Add new connection → Prometheus → Add new data source**

```text
URL: http://prometheus:9090    (container name if on same network)
     http://localhost:9090     (if Grafana is on host)

Access: Server (default)
```

Click **Save & Test** - should show "Successfully queried the Prometheus API."

## Step 2: Import the cAdvisor Dashboard

The fastest path to container metrics:

1. **Dashboards → New → Import**
2. Enter ID: **14282** (Cadvisor exporter)
3. Select your Prometheus data source
4. Click **Import**

## Step 3: Create a Custom Container Dashboard

For a tailored view, create a new dashboard:

**Dashboards → New → New Dashboard → Add Visualization**

### Panel 1: Container CPU Usage (%)

```promql
sum(rate(container_cpu_usage_seconds_total{name!="", name!~".*POD.*"}[$__rate_interval])) by (name) * 100
```

- Type: Time series
- Unit: Percent (0-100)
- Legend: `{{name}}`

### Panel 2: Container Memory Usage

```promql
container_memory_working_set_bytes{name!="", name!~".*POD.*"}
```

- Type: Time series
- Unit: Bytes (IEC)
- Legend: `{{name}}`

### Panel 3: Container Network Receive Rate

```promql
sum(rate(container_network_receive_bytes_total{name!=""}[$__rate_interval])) by (name)
```

- Type: Time series
- Unit: Bytes/sec

### Panel 4: Container Count

```promql
count(container_last_seen{name!=""})
```

- Type: Stat
- Title: "Running Containers"

## Step 4: Add a Container Selector Variable

Make the dashboard filterable by container:

1. **Dashboard Settings → Variables → Add Variable**
2. Type: Query
3. Name: `container`
4. Data Source: Prometheus
5. Query type: `Label values`
6. Metric: `container_cpu_usage_seconds_total`
7. Label: `name`
8. Regex: `/.+/`
9. Multi-value: ON

Update panels to use `$container`:

```promql
container_memory_working_set_bytes{name=~"$container"}
```

## Step 5: Add Alerting to Grafana Panels

Create the alert rule from a panel query that does not use `$container`, because Grafana evaluates alert rules on the backend.

In the panel menu: **More → New alert rule**

```text
Condition: Reduce last of A, then alert when above 80
Evaluate every: 1m, for: 5m

Labels:
  severity: warning
  container: {{ $labels.name }}

Annotations:
  summary: Container CPU high
  description: Container {{ $labels.name }} CPU at {{ $values.A.Value }}%
```

## Useful Queries Reference

```promql
# Top 5 containers by CPU

topk(5, sum(rate(container_cpu_usage_seconds_total{name!=""}[$__rate_interval])) by (name) * 100)

# Containers exceeding 1GB RAM
container_memory_working_set_bytes{name!=""} > 1073741824

# Container start-time changes (last 5 minutes)
changes(container_start_time_seconds{name!=""}[5m])

# Container memory limit utilization (%)
container_memory_working_set_bytes{name!=""} /
  container_spec_memory_limit_bytes{name!=""} * 100
```

## Conclusion

A Grafana container metrics dashboard powered by cAdvisor and Prometheus gives you instant visibility into which containers are consuming resources. Deployed and managed via Portainer, the entire monitoring stack - from scraper to dashboard - is maintained through the same interface you use to manage application containers.
