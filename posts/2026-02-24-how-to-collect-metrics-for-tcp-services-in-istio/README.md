# How to Collect Metrics for TCP Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP Metrics, Monitoring, Databases, Service Mesh

Description: Monitor TCP-based services in Istio including databases, message queues, and custom protocols using Istio's built-in TCP metrics and Prometheus.

---

Not everything in your service mesh speaks HTTP. Databases, message queues, cache servers, and custom protocols all use raw TCP connections. Istio still provides observability for these services, but the metrics are different from the HTTP ones. Instead of request counts and latency histograms, you get connection counts, bytes transferred, and connection durations. Understanding these metrics is essential if you want full visibility into your mesh.

## How Istio Handles TCP Traffic

When Envoy sees traffic that isn't HTTP or gRPC, it treats it as a TCP proxy. The sidecar still intercepts the connection, applies mTLS, and generates metrics, but it can't inspect the application-layer protocol. It only sees bytes flowing back and forth through TCP connections.

This applies to services like:
- MySQL, PostgreSQL, MongoDB
- Redis, Memcached
- Kafka, RabbitMQ, NATS
- Custom binary protocols
- Any service that doesn't use HTTP

## Default TCP Metrics

Istio generates four TCP-specific metrics by default:

| Metric | Type | Description |
|--------|------|-------------|
| `istio_tcp_connections_opened_total` | Counter | Number of TCP connections opened |
| `istio_tcp_connections_closed_total` | Counter | Number of TCP connections closed |
| `istio_tcp_sent_bytes_total` | Counter | Total bytes sent over TCP |
| `istio_tcp_received_bytes_total` | Counter | Total bytes received over TCP |

These metrics carry the same source and destination labels as HTTP metrics, so you can see which services are connecting to your databases and how much data they're transferring.

## Declaring TCP Ports in Services

For Istio to correctly identify TCP traffic, your Kubernetes Services should name their ports with the proper protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
spec:
  selector:
    app: postgres
  ports:
    - name: tcp-postgres
      port: 5432
      targetPort: 5432
    - name: tcp-metrics
      port: 9187
      targetPort: 9187
```

The `tcp-` prefix tells Istio to treat this as TCP traffic. Without it, Istio might try to parse the traffic as HTTP and generate errors.

Other valid protocol prefixes include `mysql-`, `mongo-`, `redis-`, and `grpc-`. Using the correct prefix helps Istio apply protocol-specific handling where available.

## Querying TCP Metrics

Once your TCP services are running with sidecars, you can query their metrics:

### Connection Rate

```promql
# New connections per second to PostgreSQL
sum(rate(istio_tcp_connections_opened_total{
  reporter="destination",
  destination_workload="postgres",
  destination_workload_namespace="databases"
}[5m])) by (source_workload)
```

### Active Connections (Approximate)

Istio doesn't directly track active connections as a gauge, but you can approximate it:

```promql
# Opened minus closed gives approximate active connections
sum(istio_tcp_connections_opened_total{
  destination_workload="postgres"
}) by (source_workload)
-
sum(istio_tcp_connections_closed_total{
  destination_workload="postgres"
}) by (source_workload)
```

Note: this is cumulative and resets when pods restart, so it's not perfectly accurate. For precise active connection counts, use Envoy's native metrics:

```promql
envoy_cluster_upstream_cx_active{
  cluster_name=~"outbound.*postgres.*"
}
```

### Data Transfer Rate

```promql
# Bytes per second sent to Redis
sum(rate(istio_tcp_sent_bytes_total{
  reporter="source",
  destination_workload="redis"
}[5m])) by (source_workload)

# Bytes per second received from Redis
sum(rate(istio_tcp_received_bytes_total{
  reporter="source",
  destination_workload="redis"
}[5m])) by (source_workload)
```

### Total Data Transfer

```promql
# Total data transferred to Kafka in the last 24 hours
sum(increase(istio_tcp_sent_bytes_total{
  destination_workload="kafka",
  destination_workload_namespace="messaging"
}[24h]))
```

## Monitoring Database Connections

Database connection monitoring is one of the most common use cases for TCP metrics. Here's a practical setup for PostgreSQL:

### Connection Pool Health

Track which services are creating the most database connections:

```promql
# Top 5 services by connection rate to PostgreSQL
topk(5,
  sum(rate(istio_tcp_connections_opened_total{
    reporter="destination",
    destination_workload="postgres"
  }[5m])) by (source_workload)
)
```

### Connection Churn

High connection churn (many opens and closes) usually means connection pooling isn't working:

```promql
# Connection open rate should be low if pooling is effective
sum(rate(istio_tcp_connections_opened_total{
  reporter="destination",
  destination_workload="postgres"
}[5m]))
```

If this number is high relative to your request rate, your services might be opening a new database connection for every request instead of using a pool.

### Data Volume Per Service

See which services are transferring the most data:

```promql
# Top services by data volume to PostgreSQL
topk(10,
  sum(rate(istio_tcp_sent_bytes_total{
    destination_workload="postgres"
  }[5m])) by (source_workload)
)
```

## Monitoring Message Queues

For Kafka, RabbitMQ, or other message brokers:

```promql
# Producer data rate (bytes sent to Kafka)
sum(rate(istio_tcp_sent_bytes_total{
  destination_workload="kafka-broker",
  reporter="source"
}[5m])) by (source_workload)

# Consumer data rate (bytes received from Kafka)
sum(rate(istio_tcp_received_bytes_total{
  destination_workload="kafka-broker",
  reporter="source"
}[5m])) by (source_workload)
```

## Setting Up Alerts for TCP Services

Create alerts for abnormal TCP behavior:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tcp-service-alerts
  namespace: monitoring
spec:
  groups:
    - name: tcp-services
      rules:
        - alert: HighDatabaseConnectionRate
          expr: |
            sum(rate(istio_tcp_connections_opened_total{
              destination_workload="postgres",
              reporter="destination"
            }[5m])) > 50
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Database connection rate exceeds 50/sec"
            description: "High connection churn detected on PostgreSQL. Check connection pooling."

        - alert: DatabaseConnectionDrop
          expr: |
            sum(rate(istio_tcp_connections_opened_total{
              destination_workload="postgres",
              reporter="destination"
            }[5m])) == 0
            and
            sum(rate(istio_tcp_connections_opened_total{
              destination_workload="postgres",
              reporter="destination"
            }[5m] offset 15m)) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "No new connections to PostgreSQL"

        - alert: HighDataTransferToDatabase
          expr: |
            sum(rate(istio_tcp_sent_bytes_total{
              destination_workload="postgres"
            }[5m])) > 100000000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Data transfer to PostgreSQL exceeds 100MB/s"
```

## DestinationRule for TCP Connection Pooling

While not directly a metrics topic, DestinationRules for TCP services generate metrics that help you monitor connection pool behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-pool
  namespace: databases
spec:
  host: postgres.databases.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
```

When the connection limit is hit, Envoy's circuit breaker activates. Monitor it with:

```promql
envoy_cluster_circuit_breakers_default_cx_open{
  cluster_name=~"outbound.*postgres.*"
}
```

## TCP Metrics Labels

TCP metrics carry these labels:

```
istio_tcp_connections_opened_total{
  reporter="destination",
  source_workload="order-service",
  source_workload_namespace="production",
  destination_workload="postgres",
  destination_workload_namespace="databases",
  destination_service="postgres.databases.svc.cluster.local",
  connection_security_policy="mutual_tls",
}
```

The labels are similar to HTTP metrics but don't include `response_code` or `request_protocol` since those concepts don't apply to raw TCP.

## Customizing TCP Metrics

You can add custom labels to TCP metrics using the Telemetry API, though the available attributes are more limited than HTTP:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tcp-custom-labels
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: TCP_OPENED_CONNECTIONS
            mode: CLIENT
          tagOverrides:
            destination_port:
              operation: UPSERT
              value: "destination.port"
```

## Building a TCP Services Dashboard

Create a Grafana dashboard with these panels:

1. **Connection Rate** - time series of `rate(istio_tcp_connections_opened_total[5m])` grouped by destination
2. **Data Transfer** - stacked area chart of `rate(istio_tcp_sent_bytes_total[5m])` and `rate(istio_tcp_received_bytes_total[5m])`
3. **Top Talkers** - bar chart of top 10 source workloads by bytes sent to each TCP service
4. **Connection Churn** - ratio of connection open rate to expected baseline
5. **Circuit Breaker Status** - stat panels showing circuit breaker state per TCP destination

TCP metrics might not be as flashy as HTTP metrics with their response codes and latency percentiles, but they're essential for monitoring the backbone of most applications - databases, caches, and message queues. Keep an eye on connection patterns and data transfer rates, and you'll catch problems before they impact users.
