# How to Handle Network Partitions in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Network Partition, Resiliency, Circuit Breaker, Reliability

Description: Learn how to configure Dapr to detect and survive network partitions using circuit breakers, fallback patterns, and actor placement recovery.

---

## What Is a Network Partition

A network partition is a communication break between nodes or services - pods cannot reach each other even though they are individually healthy. In Kubernetes, this can happen during node failures, DNS outages, or CNI plugin problems. Dapr services experiencing a partition must degrade gracefully rather than queue requests indefinitely or cascade failures.

## Circuit Breakers for Partition Detection

Circuit breakers are the primary tool for handling partitions. When a service becomes unreachable, the circuit opens and subsequent calls fail fast:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: partition-resiliency
  namespace: production
spec:
  policies:
    timeouts:
      partitionTimeout: 5s

    retries:
      partitionRetry:
        policy: exponential
        initialInterval: 1s
        maxInterval: 30s
        maxRetries: 5

    circuitBreakers:
      partitionCB:
        maxRequests: 1
        timeout: 60s
        trip: consecutiveFailures >= 3

  targets:
    apps:
      inventory-service:
        timeout: partitionTimeout
        retry: partitionRetry
        circuitBreaker: partitionCB
      payment-service:
        timeout: partitionTimeout
        retry: partitionRetry
        circuitBreaker: partitionCB
```

## Fallback Behavior During Partitions

Implement graceful fallback when the circuit is open:

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError
import json

def get_product_price(product_id: str) -> float:
    try:
        with DaprClient() as client:
            response = client.invoke_method(
                app_id="pricing-service",
                method_name=f"prices/{product_id}",
                http_verb="GET"
            )
            data = json.loads(response.data)
            # Cache successful result
            cache_price(product_id, data["price"])
            return data["price"]
    except DaprInternalError:
        # Fall back to cached price during partition
        cached = get_cached_price(product_id)
        if cached:
            return cached
        # Return list price as last resort
        return get_list_price(product_id)
```

## Pub/Sub Durability During Partitions

Unlike service invocation, pub/sub with a durable broker (Kafka, RabbitMQ) survives partitions naturally. Messages accumulate in the broker and are delivered when connectivity resumes:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: durable-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-bootstrap:9092"
  - name: consumerGroup
    value: "order-processors"
  - name: maxMessageBytes
    value: "1048576"
```

## Actor Placement Service Recovery

Dapr Actors use a placement service to distribute actors across nodes. During a partition, the placement service detects missing nodes and redistributes actors. Configure the placement service with a quorum for split-brain protection:

```yaml
# dapr-system configuration
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dapr-placement-server
  namespace: dapr-system
spec:
  replicas: 3  # Odd number for quorum
```

## Monitoring Partition Events

Create alerts for circuit breaker state changes:

```yaml
groups:
- name: dapr-partitions
  rules:
  - alert: CircuitBreakerOpen
    expr: dapr_resiliency_cb_state{status="open"} > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Circuit breaker open - possible network partition for {{ $labels.app_id }}"
```

## Summary

Network partitions in Dapr applications are handled through circuit breakers that detect consecutive failures and open the circuit, preventing request queuing. Application code falls back to cached data or degraded responses when the circuit is open. Pub/sub with durable brokers provides natural partition tolerance for async communication, while a 3-node placement service quorum prevents split-brain in actor deployments.
