# How to Configure PriorityLevelConfiguration for API Server Fair Queuing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Performance, Resource Management

Description: Learn how to configure PriorityLevelConfiguration resources to implement fair queuing for Kubernetes API requests, prevent resource starvation, and ensure equitable API server access.

---

PriorityLevelConfiguration defines how the API server handles requests at different priority levels. Fair queuing ensures that no single client monopolizes API server resources. Each priority level gets a share of concurrency, requests queue when limits are reached, and shuffle-sharding distributes load fairly across multiple flows.

## Understanding Fair Queuing Mechanics

Fair queuing prevents a single misbehaving client from consuming all API server capacity. The system uses shuffle-sharding to assign requests to queues based on the flow distinguisher (typically username and namespace). Multiple queues at each priority level ensure different flows do not block each other.

View existing PriorityLevelConfigurations:

```bash
# List all priority levels
kubectl get prioritylevelconfigurations

# View detailed configuration
kubectl get prioritylevelconfiguration workload-high -o yaml

# Check current status
kubectl describe prioritylevelconfiguration workload-high
```

The status shows current utilization, queue depth, and rejected requests.

## Creating a Basic PriorityLevelConfiguration

Define a priority level with fair queuing:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: fair-workload
spec:
  type: Limited
  limited:
    # Concurrency shares (total available = sum of all shares)
    nominalConcurrencyShares: 40

    # Percentage that can be borrowed when unused
    lendablePercent: 50

    # How to handle requests when limit is reached
    limitResponse:
      type: Queue
      queuing:
        # Number of queues for shuffle-sharding
        queues: 64

        # Maximum requests per queue
        queueLengthLimit: 50

        # Number of queues each flow can use
        handSize: 8
```

Apply the configuration:

```bash
kubectl apply -f prioritylevel.yaml

# Verify creation
kubectl get prioritylevelconfiguration fair-workload

# Watch real-time status
kubectl get prioritylevelconfiguration fair-workload -o yaml -w
```

## Configuring Concurrency Shares

Concurrency shares determine the relative weight of each priority level. The API server calculates actual concurrency as:

```
Actual Concurrency = (nominalConcurrencyShares / Total Shares) * Server Capacity
```

Create priority levels with different weights:

```yaml
# High priority: 100 shares
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: critical-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 100
    lendablePercent: 20
    limitResponse:
      type: Queue
      queuing:
        queues: 32
        queueLengthLimit: 100
        handSize: 10
---
# Medium priority: 50 shares
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: normal-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 50
    lendablePercent: 50
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 50
        handSize: 8
---
# Low priority: 20 shares
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: background-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 20
    lendablePercent: 80
    limitResponse:
      type: Queue
      queuing:
        queues: 32
        queueLengthLimit: 25
        handSize: 4
```

With total shares of 170, critical-priority gets 100/170 = 59% of capacity, normal-priority gets 29%, and background-priority gets 12%.

## Setting Up Lendable Capacity

Lendable capacity allows unused concurrency to be borrowed by other priority levels:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: lending-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 60
    # 80% can be borrowed when unused
    lendablePercent: 80
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 50
        handSize: 8
```

When this priority level is idle, 80% of its 60 shares (48 shares) become available for other levels to borrow.

## Configuring Queue Parameters

Queue parameters control fairness and responsiveness:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: tuned-queuing
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 50
    lendablePercent: 50
    limitResponse:
      type: Queue
      queuing:
        # More queues = better isolation between flows
        queues: 128

        # Higher limit = more buffering before rejection
        queueLengthLimit: 100

        # Smaller hand = less sharing between flows
        handSize: 4
```

Parameter guidelines:

- `queues`: Power of 2, typically 32-128. More queues = better isolation but more memory
- `queueLengthLimit`: 25-100. Higher values buffer more requests during spikes
- `handSize`: 4-10. Smaller values improve isolation, larger values improve throughput

## Implementing Reject-Based Rate Limiting

Use rejection instead of queuing for certain workloads:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: reject-on-overflow
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 30
    lendablePercent: 50
    limitResponse:
      # Reject immediately when concurrency limit is reached
      type: Reject
```

Requests exceeding the concurrency limit receive HTTP 429 (Too Many Requests) immediately instead of queuing.

## Creating Exempt Priority Levels

Exempt priority levels bypass all queuing and limits:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: system-exempt
spec:
  # Exempt from all limits
  type: Exempt
```

Use exempt priority sparingly, only for critical system components. Typical use cases:

- Leader election for controllers
- Kubernetes system components (kube-scheduler, kube-controller-manager)
- Health check probes

## Monitoring Queue Utilization

Track priority level performance:

```promql
# Current concurrency by priority level
apiserver_flowcontrol_current_executing_requests{priority_level="fair-workload"}

# Queue depth
apiserver_flowcontrol_current_inqueue_requests{priority_level="fair-workload"}

# Rejected requests (indicates overload)
rate(apiserver_flowcontrol_rejected_requests_total{priority_level="fair-workload"}[5m])

# Request wait time in queue
histogram_quantile(0.99,
  rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket{
    priority_level="fair-workload"
  }[5m])
)

# Seats occupied (concurrency usage)
apiserver_flowcontrol_current_limit_seats{priority_level="fair-workload"}

# Dispatched requests
rate(apiserver_flowcontrol_dispatched_requests_total{priority_level="fair-workload"}[5m])
```

Create a Grafana dashboard:

```json
{
  "panels": [
    {
      "title": "Concurrency by Priority Level",
      "targets": [{
        "expr": "apiserver_flowcontrol_current_executing_requests"
      }]
    },
    {
      "title": "Queue Depth",
      "targets": [{
        "expr": "apiserver_flowcontrol_current_inqueue_requests"
      }]
    },
    {
      "title": "Request Rejection Rate",
      "targets": [{
        "expr": "rate(apiserver_flowcontrol_rejected_requests_total[5m])"
      }]
    },
    {
      "title": "P99 Wait Time",
      "targets": [{
        "expr": "histogram_quantile(0.99, rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m]))"
      }]
    }
  ]
}
```

## Tuning for High-Throughput Workloads

Optimize for controllers that make many API requests:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: high-throughput
spec:
  type: Limited
  limited:
    # High concurrency for throughput
    nominalConcurrencyShares: 150

    # Low lendable percent (we need this capacity)
    lendablePercent: 10

    limitResponse:
      type: Queue
      queuing:
        # Many queues for isolation
        queues: 128

        # Large queue for buffering
        queueLengthLimit: 200

        # Larger hand for throughput
        handSize: 12
```

## Configuring for Latency-Sensitive Operations

Optimize for low-latency, interactive requests:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: low-latency
spec:
  type: Limited
  limited:
    # Moderate concurrency
    nominalConcurrencyShares: 60

    # Can lend when idle
    lendablePercent: 60

    limitResponse:
      type: Queue
      queuing:
        # Fewer queues (less overhead)
        queues: 32

        # Small queue (fail fast)
        queueLengthLimit: 10

        # Small hand for quick dispatch
        handSize: 4
```

## Implementing Progressive Backoff

Configure clients to handle rate limiting gracefully:

```go
// client-with-backoff.go
package main

import (
    "context"
    "time"

    "k8s.io/apimachinery/pkg/api/errors"
    "k8s.io/apimachinery/pkg/util/wait"
    "k8s.io/client-go/util/retry"
)

func makeRequestWithBackoff(ctx context.Context, fn func() error) error {
    backoff := wait.Backoff{
        Steps:    5,
        Duration: 10 * time.Millisecond,
        Factor:   2.0,
        Jitter:   0.1,
        Cap:      10 * time.Second,
    }

    return retry.OnError(backoff, func(err error) bool {
        // Retry on 429 Too Many Requests
        if statusErr, ok := err.(*errors.StatusError); ok {
            return statusErr.ErrStatus.Code == 429
        }
        return false
    }, func() error {
        return fn()
    })
}

// Usage
err := makeRequestWithBackoff(ctx, func() error {
    return client.Get(ctx, name, &pod)
})
```

## Creating Alerts for Queue Saturation

Alert when priority levels are overloaded:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: priority-level-alerts
  namespace: monitoring
spec:
  groups:
  - name: api-priority-levels
    rules:
    - alert: PriorityLevelQueueFull
      expr: |
        apiserver_flowcontrol_current_inqueue_requests /
        (apiserver_flowcontrol_request_queue_length_after_enqueue_total > 0) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Priority level {{ $labels.priority_level }} queue near capacity"

    - alert: HighRequestRejectionRate
      expr: |
        rate(apiserver_flowcontrol_rejected_requests_total[5m]) > 10
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High rejection rate for {{ $labels.priority_level }}"
        description: "{{ $value }} requests/sec rejected"

    - alert: LongQueueWaitTime
      expr: |
        histogram_quantile(0.99,
          rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m])
        ) > 2.0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Long queue wait times"
        description: "P99 wait time is {{ $value }}s"
```

## Troubleshooting Configuration Issues

Debug priority level problems:

```bash
# Check current concurrency utilization
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_current_executing_requests'

# View rejection counts
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_rejected_requests_total'

# Check if queues are full
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_current_inqueue_requests'

# Verify configuration syntax
kubectl get prioritylevelconfiguration <name> -o yaml

# Test with verbose client
kubectl get pods --v=6 2>&1 | grep -i "throttle\|rate\|wait"
```

Common fixes:

```bash
# Increase concurrency shares
kubectl patch prioritylevelconfiguration <name> \
  --type merge \
  --patch '{"spec":{"limited":{"nominalConcurrencyShares":100}}}'

# Increase queue length
kubectl patch prioritylevelconfiguration <name> \
  --type merge \
  --patch '{"spec":{"limited":{"limitResponse":{"queuing":{"queueLengthLimit":100}}}}}'

# Increase lendable percent
kubectl patch prioritylevelconfiguration <name> \
  --type merge \
  --patch '{"spec":{"limited":{"lendablePercent":75}}}'
```

PriorityLevelConfiguration enables fair API server resource allocation through queuing and concurrency limits. Configure appropriate shares for different workload types, monitor queue utilization, and adjust parameters based on observed request patterns to maintain API server responsiveness.
