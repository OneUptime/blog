# How to Configure Dapr Connection Pooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Connection Pool, Performance, Configuration, Optimization

Description: Configure connection pooling in Dapr state stores, pub/sub brokers, and bindings to maximize throughput and minimize connection overhead.

---

## Connection Pooling in Dapr Components

Dapr components that connect to external services (Redis, Kafka, databases) support connection pooling to reuse established connections rather than creating new ones per request. Proper pool configuration is critical for high-throughput applications to avoid connection exhaustion and minimize latency.

## Redis State Store Connection Pool

The Redis state store (backed by the go-redis library) exposes several pooling parameters:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
    - name: poolSize
      value: "20"           # Max connections in pool per node
    - name: minIdleConns
      value: "5"            # Min idle connections kept alive
    - name: poolTimeout
      value: "4000"         # Wait time for connection (ms)
    - name: idleTimeout
      value: "300000"       # Close idle connections after 5min (ms)
    - name: maxConnAge
      value: "3600000"      # Max connection age 1hr (ms)
```

## Kafka Pub/Sub Connection Pool

Configure the Kafka pub/sub component for high-throughput:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka-1:9092,kafka-2:9092,kafka-3:9092
    - name: consumerGroup
      value: my-service-group
    - name: clientID
      value: my-service
    - name: maxMessageBytes
      value: "1048576"
    - name: channelBufferSize
      value: "256"     # Internal channel buffer for async processing
    - name: consumerFetchMin
      value: "1"       # Fetch at least 1 byte (reduce wait)
    - name: consumerFetchDefault
      value: "1048576"  # Default fetch 1MB per request
```

## PostgreSQL Binding Connection Pool

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-db
spec:
  type: bindings.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "host=pg-primary port=5432 dbname=app user=dapr sslmode=require pool_max_conns=20 pool_min_conns=5 pool_max_conn_lifetime=3600s pool_max_conn_idle_time=300s"
```

## Monitoring Pool Health

Track connection pool metrics via Prometheus:

```bash
# Redis state operation success rate (higher is better)
rate(dapr_component_state_count{app_id="my-service",operation="get",status="success"}[5m])
/
rate(dapr_component_state_count{app_id="my-service",operation="get"}[5m])

# Component operation latency (pool exhaustion shows as high latency)
histogram_quantile(0.99,
  rate(dapr_component_state_latencies_bucket{app_id="my-service"}[5m])
)
```

## Connection Pool Sizing Formula

A practical formula for pool sizing:

```text
pool_size = (avg_requests_per_second * avg_latency_seconds) + buffer
```

For an application making 500 requests/second with 20ms average latency:
```text
pool_size = (500 * 0.020) + 5 = 15 connections
```

## gRPC Connection Pooling

For client-side gRPC connection tuning in your application, configure window sizes to allow higher concurrency on a single connection:

```go
// Go - connect to Dapr gRPC with tuned window sizes
import "google.golang.org/grpc"

conn, err := grpc.NewClient(
    "localhost:50001",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithInitialWindowSize(1<<20),
    grpc.WithInitialConnWindowSize(1<<20),
)
```

## Summary

Dapr connection pooling is configured at the component level through metadata fields specific to each component type. Proper pool sizing - based on request rate and latency - prevents connection exhaustion under load, while idle connection timeouts prevent resource leaks. Monitoring component operation latency is the most reliable indicator of pool exhaustion, as requests begin queuing when no connections are available.
