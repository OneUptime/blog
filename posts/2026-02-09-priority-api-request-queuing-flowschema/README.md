# How to Set Up Priority-Based API Request Queuing with FlowSchema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Performance, QoS

Description: Learn how to configure FlowSchema resources to implement priority-based API request queuing, prevent API server overload, and ensure fair resource allocation across different request types.

---

The Kubernetes API server can become overwhelmed when handling thousands of requests from controllers, operators, and users. API Priority and Fairness (APF) uses FlowSchema resources to categorize incoming requests and assign them to priority levels. This prevents low-priority requests from starving high-priority operations and ensures the API server remains responsive under load.

## Understanding FlowSchema and Priority Levels

FlowSchema resources classify API requests based on their characteristics like user, resource type, verb, or namespace. Each FlowSchema references a PriorityLevelConfiguration that determines how many concurrent requests can execute and how requests queue when limits are exceeded.

The API server comes with built-in FlowSchemas and PriorityLevelConfigurations. View the default configuration:

```bash
# List existing FlowSchemas
kubectl get flowschemas

# View a specific FlowSchema
kubectl get flowschema system-leader-election -o yaml

# List PriorityLevelConfigurations
kubectl get prioritylevelconfigurations

# View a priority level
kubectl get prioritylevelconfiguration system -o yaml
```

Default FlowSchemas handle system components, leader election, health checks, and catch-all requests. The matching priority increases from 1 (highest) to 10000 (lowest).

## Creating a Custom FlowSchema

Define a FlowSchema for your application's requests:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: app-workload-high
spec:
  # Priority for matching (lower number = higher priority)
  matchingPrecedence: 100
  # Reference to PriorityLevel
  priorityLevelConfiguration:
    name: app-high-priority
  # Rules to match requests
  rules:
  - subjects:
    # Match requests from specific service account
    - kind: ServiceAccount
      serviceAccount:
        name: critical-controller
        namespace: production
    # Match specific resource types
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["apps"]
      resources: ["deployments", "statefulsets"]
      namespaces: ["production"]
  - subjects:
    # Match requests from specific users
    - kind: User
      user:
        name: admin@example.com
    resourceRules:
    - verbs: ["get", "list", "watch"]
      apiGroups: ["*"]
      resources: ["*"]
```

Apply the FlowSchema:

```bash
kubectl apply -f flowschema.yaml

# Verify it was created
kubectl get flowschema app-workload-high
kubectl describe flowschema app-workload-high
```

## Configuring Priority Level for the FlowSchema

Create a PriorityLevelConfiguration that defines request handling characteristics:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: app-high-priority
spec:
  type: Limited
  # Exempt type would bypass queuing entirely
  limited:
    # Number of requests that can execute concurrently
    nominalConcurrencyShares: 30
    # Queuing configuration
    lendablePercent: 50
    limitResponse:
      type: Queue
      queuing:
        # Number of queues (buckets)
        queues: 64
        # Width of each queue
        queueLengthLimit: 50
        # Total request timeout including queue wait
        handSize: 8
```

The configuration parameters control throughput and fairness:

- `nominalConcurrencyShares`: Relative weight for concurrency (higher = more concurrent requests)
- `lendablePercent`: Percentage that can be borrowed by other priority levels
- `queues`: Number of shuffle-sharding buckets for fairness
- `queueLengthLimit`: Maximum requests waiting in each queue
- `handSize`: Number of queues a flow can occupy

Apply the priority level:

```bash
kubectl apply -f prioritylevel.yaml

# Check status
kubectl get prioritylevelconfiguration app-high-priority
kubectl describe prioritylevelconfiguration app-high-priority
```

## Creating Read-Only FlowSchema

Separate read operations from writes for better control:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: readonly-queries
spec:
  matchingPrecedence: 500
  priorityLevelConfiguration:
    name: readonly-priority
  rules:
  - subjects:
    - kind: Group
      group:
        name: system:authenticated
    resourceRules:
    # Only match read operations
    - verbs: ["get", "list", "watch"]
      apiGroups: ["*"]
      resources: ["*"]
    nonResourceRules:
    - verbs: ["get"]
      nonResourceURLs: ["*"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: readonly-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 50
    lendablePercent: 75
    limitResponse:
      type: Queue
      queuing:
        queues: 128
        queueLengthLimit: 100
        handSize: 6
```

## Prioritizing System Components

Ensure system controllers have priority over user requests:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: system-controllers-high
spec:
  matchingPrecedence: 50
  priorityLevelConfiguration:
    name: system-priority
  rules:
  - subjects:
    - kind: ServiceAccount
      serviceAccount:
        name: "*"
        namespace: kube-system
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["*"]
      resources: ["*"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: system-priority
spec:
  type: Limited
  limited:
    # High concurrency for system components
    nominalConcurrencyShares: 100
    lendablePercent: 25
    limitResponse:
      type: Queue
      queuing:
        queues: 32
        queueLengthLimit: 100
        handSize: 10
```

## Implementing Namespace-Based Priorities

Prioritize requests based on namespace criticality:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: production-namespace-priority
spec:
  matchingPrecedence: 200
  priorityLevelConfiguration:
    name: production-priority
  rules:
  - subjects:
    - kind: Group
      group:
        name: system:authenticated
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["production", "critical-apps"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: development-namespace-priority
spec:
  matchingPrecedence: 800
  priorityLevelConfiguration:
    name: development-priority
  rules:
  - subjects:
    - kind: Group
      group:
        name: system:authenticated
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["dev", "test", "staging"]
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: production-priority
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 60
    lendablePercent: 30
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 75
        handSize: 8
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: development-priority
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

## Monitoring FlowSchema Performance

Track request queuing and rejection metrics:

```bash
# Enable metrics endpoint
kubectl get --raw /metrics | grep apiserver_flowcontrol

# View request counts by FlowSchema
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_dispatched_requests_total'

# Check rejected requests
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_rejected_requests_total'

# View queue length
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_current_inqueue_requests'
```

Key metrics to monitor:

```promql
# Request dispatch rate by FlowSchema
rate(apiserver_flowcontrol_dispatched_requests_total[5m])

# Request rejection rate
rate(apiserver_flowcontrol_rejected_requests_total[5m])

# Current queue depth
apiserver_flowcontrol_current_inqueue_requests

# Wait duration (how long requests wait in queue)
histogram_quantile(0.99,
  rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m])
)

# Execution duration
histogram_quantile(0.99,
  rate(apiserver_flowcontrol_request_execution_seconds_bucket[5m])
)
```

## Creating Prometheus Alerts

Alert on queue saturation and request rejections:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flowschema-alerts
  namespace: monitoring
spec:
  groups:
  - name: api-priority-fairness
    rules:
    - alert: HighAPIRequestRejectionRate
      expr: |
        rate(apiserver_flowcontrol_rejected_requests_total[5m]) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "API server is rejecting requests"
        description: "FlowSchema {{ $labels.flow_schema }} is rejecting {{ $value }} req/s"

    - alert: HighAPIRequestQueueing
      expr: |
        apiserver_flowcontrol_current_inqueue_requests > 100
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High API request queue depth"
        description: "{{ $value }} requests queued for priority level {{ $labels.priority_level }}"

    - alert: LongAPIRequestWaitTime
      expr: |
        histogram_quantile(0.99,
          rate(apiserver_flowcontrol_request_wait_duration_seconds_bucket[5m])
        ) > 1.0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Long API request wait times"
        description: "P99 wait time is {{ $value }}s for {{ $labels.flow_schema }}"
```

## Adjusting Concurrency Shares

Tune concurrency based on observed load:

```bash
# Check current concurrency utilization
kubectl get --raw /metrics | \
  grep 'apiserver_flowcontrol_current_executing_requests'

# Get PriorityLevel status
kubectl get prioritylevelconfiguration -o custom-columns=\
NAME:.metadata.name,\
SHARES:.spec.limited.nominalConcurrencyShares,\
QUEUES:.spec.limited.limitResponse.queuing.queues
```

Adjust shares based on utilization:

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: app-high-priority
spec:
  type: Limited
  limited:
    # Increase from 30 to 50 based on high utilization
    nominalConcurrencyShares: 50
    lendablePercent: 50
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        queueLengthLimit: 50
        handSize: 8
```

## Debugging Request Classification

Determine which FlowSchema matches a request:

```bash
# Check API server audit logs
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep flowSchema

# Enable verbose logging for APF
# Edit API server manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml

# Add logging flags
spec:
  containers:
  - command:
    - kube-apiserver
    - --v=4
    - --vmodule=flowcontrol*=5
```

Test FlowSchema matching:

```bash
# Make a test request and check which FlowSchema handled it
kubectl get pods --v=8 2>&1 | grep -i flow

# Check FlowSchema matching precedence
kubectl get flowschemas --sort-by=.spec.matchingPrecedence
```

## Troubleshooting Common Issues

Fix FlowSchema problems:

```bash
# Issue: Requests being rejected
# Check: Queue limits and concurrency shares
kubectl describe prioritylevelconfiguration <name>

# Increase queue length or concurrency shares
kubectl patch prioritylevelconfiguration <name> \
  --type merge \
  --patch '{"spec":{"limited":{"nominalConcurrencyShares":100}}}'

# Issue: Wrong FlowSchema matching requests
# Check: Matching precedence order
kubectl get flowschemas --sort-by=.spec.matchingPrecedence

# Adjust precedence
kubectl patch flowschema <name> \
  --type merge \
  --patch '{"spec":{"matchingPrecedence":50}}'

# Issue: No metrics available
# Check: APF is enabled (should be by default in v1.20+)
kubectl get --raw /metrics | grep flowcontrol | head
```

FlowSchema resources provide fine-grained control over API server request handling. Configure appropriate priority levels for different request types, monitor queue metrics, and adjust concurrency shares based on observed load patterns to maintain API server responsiveness.
