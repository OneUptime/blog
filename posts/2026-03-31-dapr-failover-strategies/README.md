# How to Implement Failover Strategies for Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Failover, High Availability, Resilience, Kubernetes

Description: Learn how to implement automatic and manual failover strategies for Dapr state store, pub/sub, and binding components to minimize downtime during infrastructure failures.

---

## Failover Strategies Overview

Dapr components can fail due to backend infrastructure issues, network partitions, or regional outages. A robust failover strategy defines how Dapr applications detect component failures and switch to an alternative backend. Dapr supports several failover patterns depending on the component type and failure scenario.

## Circuit Breaker for Automatic Failover

Configure Dapr resiliency policies with circuit breakers to automatically route around failed components:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: component-failover-policy
  namespace: production
spec:
  policies:
    circuitBreakers:
      primary-state-cb:
        maxRequests: 5
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 3

    retries:
      exponential-retry:
        policy: exponential
        maxInterval: 15s
        maxRetries: 5

    timeouts:
      component-timeout: 5s

  targets:
    components:
      statestore:
        outbound:
          circuitBreaker: primary-state-cb
          retry: exponential-retry
          timeout: component-timeout
      pubsub:
        outbound:
          circuitBreaker: primary-state-cb
          retry: exponential-retry
```

## Application-Level Failover Pattern

Implement a failover wrapper that tries the primary component and falls back to a secondary:

```go
package main

import (
    "context"
    "fmt"
    "log"
    dapr "github.com/dapr/go-sdk/client"
)

type FailoverStateClient struct {
    primary   string
    secondary string
    client    dapr.Client
}

func (f *FailoverStateClient) GetState(ctx context.Context, key string) ([]byte, error) {
    // Try primary first
    result, err := f.client.GetState(ctx, f.primary, key, nil)
    if err == nil && result != nil {
        return result.Value, nil
    }

    log.Printf("Primary state store failed: %v. Trying secondary...", err)

    // Fall back to secondary
    result, err = f.client.GetState(ctx, f.secondary, key, nil)
    if err != nil {
        return nil, fmt.Errorf("both primary and secondary state stores failed: %w", err)
    }
    return result.Value, nil
}
```

## Multi-Component Pub/Sub Failover

Configure a primary and backup pub/sub component and switch at subscription time:

```yaml
# Primary pub/sub
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-primary
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-primary:9092"
  - name: authType
    value: "none"
  - name: consumerGroup
    value: "production"
```

```yaml
# Backup pub/sub
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-backup
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-backup:6379"
```

Toggle between components using an environment variable:

```python
import json
import os
from dapr.clients import DaprClient

PUBSUB_NAME = os.environ.get("DAPR_PUBSUB_NAME", "pubsub-primary")

def publish_event(topic: str, data: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name=PUBSUB_NAME,
            topic_name=topic,
            data=json.dumps(data),
            data_content_type="application/json",
        )
```

## Automated Failover with Kubernetes ConfigMaps

Use a ConfigMap to drive component selection and update it during failover:

```bash
#!/bin/bash
# trigger-failover.sh - call this when primary component fails

kubectl patch configmap dapr-failover-config \
  -n production \
  --type merge \
  -p '{"data": {"DAPR_PUBSUB_NAME": "pubsub-backup", "FAILOVER_ACTIVE": "true"}}'

# Restart services to pick up new configuration
kubectl rollout restart deployment -n production

echo "Failover initiated. Monitor with:"
echo "kubectl rollout status deployment -n production"
```

## Monitoring Failover Events

```bash
# Alert on circuit breaker trips
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-failover-alerts
spec:
  groups:
  - name: dapr.failover
    rules:
    - alert: DaprCircuitBreakerOpen
      expr: dapr_resiliency_cb_state{status="open"} == 1
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Dapr circuit breaker is open for {{ \$labels.target }} ({{ \$labels.name }})"
EOF
```

## Summary

Dapr failover strategies range from automatic circuit breakers configured in Resiliency policies to application-level fallback patterns and Kubernetes ConfigMap-driven component switching. Configure circuit breakers with appropriate trip thresholds for each component type, implement application-level failover wrappers for critical state operations, and prepare runbook scripts that update ConfigMaps and trigger rolling restarts to switch components under pressure. Monitor circuit breaker state with Prometheus alerts to detect failover events early.
