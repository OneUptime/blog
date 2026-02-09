# How to Tune Kubernetes API Server Request Throttling and Rate Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Performance

Description: Learn how to configure Kubernetes API server request throttling and rate limits using APF (API Priority and Fairness) to protect your control plane from overload while ensuring fair resource allocation.

---

The Kubernetes API server is the gateway to all cluster operations, and protecting it from overload is critical for cluster stability. API Priority and Fairness (APF) replaced the older max-requests-inflight throttling mechanism, providing sophisticated request prioritization and fair queuing to prevent any single client from overwhelming the API server.

This guide covers how to configure APF, tune flow schemas and priority levels, and implement custom rate limiting for different API clients.

## Understanding API Priority and Fairness

APF classifies incoming requests into flow schemas based on user, namespace, resource, or other criteria. Each flow schema maps to a priority level that determines queuing behavior and concurrency limits.

Key concepts:

- **FlowSchema**: Matches requests based on criteria and assigns them to a priority level
- **PriorityLevelConfiguration**: Defines concurrency limits and queuing behavior
- **Request classification**: Determines which flow schema handles each request
- **Fair queuing**: Ensures equitable resource distribution among competing flows

## Checking Current APF Configuration

View existing priority levels and flow schemas:

```bash
# List priority level configurations
kubectl get prioritylevelconfigurations

# Common default priority levels:
# - system
# - leader-election
# - workload-high
# - workload-low
# - global-default
# - exempt
# - catch-all

# List flow schemas
kubectl get flowschemas

# View details of a specific priority level
kubectl get prioritylevelconfiguration workload-high -o yaml

# View details of a specific flow schema
kubectl get flowschema system-nodes -o yaml
```

## Enabling API Priority and Fairness

APF is enabled by default in Kubernetes 1.20+. Verify it's enabled:

```bash
# Check API server flags
kubectl get pods -n kube-system kube-apiserver-<node-name> -o yaml | grep enable-priority-and-fairness

# Should show: --enable-priority-and-fairness=true
```

If not enabled, add to API server configuration:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --enable-priority-and-fairness=true
    - --enable-flowcontrol-api-v1beta3=true
```

## Creating Custom Priority Levels

Define custom priority levels for different workload classes:

```yaml
# custom-priority-levels.yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: batch-jobs
spec:
  type: Limited
  limited:
    # Total concurrent requests for this priority level
    assuredConcurrencyShares: 20
    limitResponse:
      type: Queue
      queuing:
        # Number of queues (should be prime number)
        queues: 64
        # Queue length per queue
        queueLengthLimit: 50
        # Hand size for shuffle sharding
        handSize: 8
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: monitoring-high
spec:
  type: Limited
  limited:
    assuredConcurrencyShares: 50
    limitResponse:
      type: Queue
      queuing:
        queues: 128
        queueLengthLimit: 100
        handSize: 8
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: development
spec:
  type: Limited
  limited:
    assuredConcurrencyShares: 10
    limitResponse:
      type: Reject  # Reject excess requests instead of queuing
```

Apply the configurations:

```bash
kubectl apply -f custom-priority-levels.yaml
```

## Creating Flow Schemas

Map requests to priority levels using flow schemas:

```yaml
# custom-flow-schemas.yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: batch-job-controller
spec:
  priorityLevelConfiguration:
    name: batch-jobs
  matchingPrecedence: 1000
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: ServiceAccount
      serviceAccount:
        name: batch-controller
        namespace: kube-system
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["batch"]
      resources: ["jobs", "cronjobs"]
      namespaces: ["*"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: monitoring-exporters
spec:
  priorityLevelConfiguration:
    name: monitoring-high
  matchingPrecedence: 2000
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: ServiceAccount
      serviceAccount:
        name: prometheus
        namespace: monitoring
    - kind: ServiceAccount
      serviceAccount:
        name: metrics-server
        namespace: kube-system
    resourceRules:
    - verbs: ["get", "list", "watch"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["*"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: dev-namespace-limit
spec:
  priorityLevelConfiguration:
    name: development
  matchingPrecedence: 3000
  distinguisherMethod:
    type: ByNamespace
  rules:
  - subjects:
    - kind: User
      user:
        name: "*"
    nonResourceRules:
    - verbs: ["*"]
      nonResourceURLs: ["*"]
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["development", "dev-*"]
```

Apply flow schemas:

```bash
kubectl apply -f custom-flow-schemas.yaml

# Verify flow schemas are active
kubectl get flowschemas -o wide
```

## Tuning Concurrency Shares

Calculate appropriate concurrency shares based on cluster size and load:

```yaml
# For a medium cluster (100-500 nodes)
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: workload-high
spec:
  type: Limited
  limited:
    # Shares determine relative concurrency allocation
    # Total concurrency = (shares / total shares) * max-requests-inflight
    assuredConcurrencyShares: 100
    limitResponse:
      type: Queue
      queuing:
        queues: 128
        queueLengthLimit: 100
        handSize: 8
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: workload-low
spec:
  type: Limited
  limited:
    assuredConcurrencyShares: 30
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 50
        handSize: 6
```

The actual concurrency for each level:

```
Concurrency = (assuredConcurrencyShares / sum of all shares) * max-requests-inflight

Example with max-requests-inflight=800:
- workload-high: (100 / 400) * 800 = 200 concurrent requests
- workload-low: (30 / 400) * 800 = 60 concurrent requests
```

## Configuring API Server Concurrency Limits

Set global API server concurrency limits:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - command:
    - kube-apiserver
    # Total concurrent read requests
    - --max-requests-inflight=800
    # Total concurrent write requests
    - --max-mutating-requests-inflight=400
    # Enable APF
    - --enable-priority-and-fairness=true
```

For large clusters (1000+ nodes), increase these values:

```yaml
- --max-requests-inflight=1600
- --max-mutating-requests-inflight=800
```

## Monitoring APF Metrics

Query APF metrics from Prometheus:

```promql
# Current requests in flight by priority level
apiserver_current_inflight_requests

# Request queue length
apiserver_flowcontrol_current_inqueue_requests

# Rejected requests
rate(apiserver_flowcontrol_rejected_requests_total[5m])

# Request wait duration (queuing time)
histogram_quantile(0.99,
  rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m])
)

# Requests dispatched from queue
rate(apiserver_flowcontrol_dispatched_requests_total[5m])
```

Create alerts for APF issues:

```yaml
# apf-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-apf-alerts
  namespace: monitoring
data:
  apf-alerts.yml: |
    groups:
    - name: api_priority_fairness
      interval: 30s
      rules:
      - alert: HighAPIRequestQueueLength
        expr: apiserver_flowcontrol_current_inqueue_requests > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API request queue length"
          description: "Priority level {{ $labels.priority_level }} has {{ $value }} requests queued"

      - alert: HighAPIRequestRejectionRate
        expr: rate(apiserver_flowcontrol_rejected_requests_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High API request rejection rate"
          description: "{{ $value }} requests/sec being rejected for priority level {{ $labels.priority_level }}"

      - alert: HighAPIRequestWaitTime
        expr: |
          histogram_quantile(0.99,
            rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API request wait time"
          description: "P99 wait time is {{ $value }}s for priority level {{ $labels.priority_level }}"
```

## Debugging Rate Limiting Issues

Check which requests are being throttled:

```bash
# View API server logs for rate limiting events
kubectl logs -n kube-system kube-apiserver-<node-name> | grep -i "rate\|throttl\|reject"

# Check flowschema status
kubectl get flowschemas -o json | jq '.items[] | {name: .metadata.name, priorityLevel: .spec.priorityLevelConfiguration.name, precedence: .spec.matchingPrecedence}'

# View current request counts per priority level
kubectl get --raw /metrics | grep apiserver_current_inflight_requests

# Identify which service accounts are making most requests
kubectl get --raw /metrics | grep apiserver_request_total
```

Test rate limiting with a high-volume client:

```bash
# Generate many API requests
for i in {1..1000}; do
  kubectl get pods --all-namespaces &
done

# Monitor queue lengths during load
watch -n 1 'kubectl get --raw /metrics | grep apiserver_flowcontrol_current_inqueue_requests'
```

## Best Practices for APF Configuration

1. **Use appropriate precedence values**: Lower numbers match first, use gaps (1000, 2000, 3000) for future insertion

2. **Choose the right distinguisher method**:
   - `ByUser`: Separate queues per user (good for multi-tenant)
   - `ByNamespace`: Separate queues per namespace
   - Leave unset: All requests share same queues

3. **Set realistic queue lengths**: Queuing adds latency, prefer rejection for delay-sensitive workloads

4. **Monitor continuously**: Track rejection rates, queue lengths, and wait times

5. **Test under load**: Validate APF configuration handles expected traffic patterns

6. **Protect critical operations**: Give higher priority to system components (kubelet, kube-controller-manager)

Example production configuration:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: production-critical
spec:
  type: Limited
  limited:
    assuredConcurrencyShares: 150
    limitResponse:
      type: Queue
      queuing:
        queues: 128
        queueLengthLimit: 100
        handSize: 8
```

Properly configured API Priority and Fairness protects your API server from overload while ensuring fair access for all clients. Start with the default configuration, monitor request patterns and throttling behavior, and adjust priority levels and flow schemas based on your cluster's specific workload characteristics and requirements.
