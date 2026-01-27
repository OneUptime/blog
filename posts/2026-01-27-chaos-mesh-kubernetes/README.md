# How to Use Chaos Mesh for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Chaos Engineering, Chaos Mesh, Resilience, DevOps, SRE, Fault Injection, Observability

Description: A comprehensive guide to implementing chaos engineering in Kubernetes using Chaos Mesh for fault injection, network chaos, and resilience testing.

---

> "The best way to have confidence in your system's resilience is to test it by intentionally breaking things in production-like environments. Chaos Mesh brings Netflix-style chaos engineering to every Kubernetes cluster."

## What is Chaos Mesh?

Chaos Mesh is a cloud-native chaos engineering platform for Kubernetes. It allows you to inject various types of faults into your cluster to test system resilience, identify weaknesses, and build confidence in your infrastructure.

Key capabilities include:
- **PodChaos** - Kill pods, container failures
- **NetworkChaos** - Latency, packet loss, partitions
- **IOChaos** - File system faults, disk latency
- **TimeChaos** - Clock skew simulation
- **Workflows** - Orchestrate complex chaos experiments

## Installing Chaos Mesh

### Prerequisites

Ensure you have:
- A running Kubernetes cluster (v1.20+)
- kubectl configured
- Helm 3.x installed

### Installation with Helm

```bash
# Add the Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org

# Update your local Helm chart repository cache
helm repo update

# Create the chaos-mesh namespace
kubectl create namespace chaos-mesh

# Install Chaos Mesh with default configuration
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

### Verify Installation

```bash
# Check that all Chaos Mesh components are running
kubectl get pods -n chaos-mesh

# Expected output shows controller-manager, chaos-daemon, and dashboard
# NAME                                        READY   STATUS    RESTARTS   AGE
# chaos-controller-manager-xxx                1/1     Running   0          2m
# chaos-daemon-xxxxx                          1/1     Running   0          2m
# chaos-dashboard-xxxxx                       1/1     Running   0          2m
```

### Installation Options for Different Runtimes

```yaml
# values.yaml for Docker runtime
chaosDaemon:
  runtime: docker
  socketPath: /var/run/docker.sock

# values.yaml for containerd runtime (default for most modern clusters)
chaosDaemon:
  runtime: containerd
  socketPath: /run/containerd/containerd.sock

# values.yaml for CRI-O runtime
chaosDaemon:
  runtime: crio
  socketPath: /var/run/crio/crio.sock
```

## PodChaos: Testing Pod Failures

PodChaos simulates pod failures to test how your application handles pod termination and restarts.

### Pod Kill Experiment

```yaml
# pod-kill-experiment.yaml
# This experiment randomly kills pods matching the selector every 30 seconds
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: chaos-mesh
spec:
  # Action type: pod-kill terminates the pod process
  action: pod-kill

  # Mode determines how many pods are affected
  # one: affects one random pod
  # all: affects all matching pods
  # fixed: affects a fixed number of pods
  # fixed-percent: affects a percentage of pods
  # random-max-percent: affects up to a random percentage
  mode: one

  # Selector determines which pods are targets
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-application

  # Schedule using cron syntax (optional)
  # Runs every 30 seconds
  scheduler:
    cron: "*/30 * * * * *"

  # Duration of the chaos experiment
  duration: "5m"
```

### Pod Failure Experiment

```yaml
# pod-failure-experiment.yaml
# This experiment makes pods unavailable by injecting failures
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-example
  namespace: chaos-mesh
spec:
  # pod-failure makes the pod unavailable for the duration
  action: pod-failure
  mode: fixed

  # Affect exactly 2 pods
  value: "2"

  selector:
    namespaces:
      - production
    labelSelectors:
      app: api-server
      tier: backend

  # The pod will be unavailable for 60 seconds
  duration: "60s"
```

### Container Kill Experiment

```yaml
# container-kill-experiment.yaml
# Kills a specific container within a pod (useful for sidecars)
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: container-kill-example
  namespace: chaos-mesh
spec:
  action: container-kill
  mode: all

  # Specify which container to kill
  containerNames:
    - sidecar-proxy

  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-service

  duration: "30s"
```

## NetworkChaos: Simulating Network Issues

NetworkChaos lets you simulate network partitions, latency, packet loss, and corruption.

### Network Latency Experiment

```yaml
# network-latency-experiment.yaml
# Adds 100ms latency with 25ms jitter to network traffic
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency-example
  namespace: chaos-mesh
spec:
  # delay: adds latency to packets
  # loss: drops packets
  # duplicate: duplicates packets
  # corrupt: corrupts packets
  # partition: creates network partition
  action: delay
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: frontend

  # Delay configuration
  delay:
    # Base latency to add
    latency: "100ms"

    # Random variation in latency (jitter)
    jitter: "25ms"

    # Correlation with previous packet (0-100)
    # Higher values mean latency is more consistent
    correlation: "50"

  # Direction of traffic to affect
  # to: outgoing traffic
  # from: incoming traffic
  # both: all traffic
  direction: to

  # Optional: only affect traffic to specific targets
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: backend-api
    mode: all

  duration: "5m"
```

### Packet Loss Experiment

```yaml
# packet-loss-experiment.yaml
# Simulates unreliable network by dropping 30% of packets
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss-example
  namespace: chaos-mesh
spec:
  action: loss
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: payment-service

  loss:
    # Percentage of packets to drop (0-100)
    loss: "30"

    # Correlation with previous packet
    correlation: "25"

  direction: both
  duration: "2m"
```

### Network Partition Experiment

```yaml
# network-partition-experiment.yaml
# Creates a network partition between two sets of pods
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition-example
  namespace: chaos-mesh
spec:
  action: partition
  mode: all

  # Source pods that will be partitioned
  selector:
    namespaces:
      - default
    labelSelectors:
      app: service-a

  # Target pods to partition from
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: service-b
    mode: all

  # Direction of the partition
  direction: both

  duration: "3m"
```

### Bandwidth Limitation

```yaml
# bandwidth-limit-experiment.yaml
# Limits bandwidth to simulate slow network connections
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: bandwidth-limit-example
  namespace: chaos-mesh
spec:
  action: bandwidth
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: file-upload-service

  bandwidth:
    # Rate limit (supports k, m, g suffixes for kbit, mbit, gbit)
    rate: "1mbps"

    # Maximum bytes that can be sent instantaneously
    limit: 20000

    # Bytes that can be sent at maximum rate before throttling
    buffer: 10000

  direction: to
  duration: "10m"
```

## IOChaos: Testing Storage Failures

IOChaos injects faults into the file system layer to test how applications handle storage issues.

### IO Latency Experiment

```yaml
# io-latency-experiment.yaml
# Adds latency to file system operations
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-latency-example
  namespace: chaos-mesh
spec:
  # latency: adds delay to IO operations
  # fault: returns errors for IO operations
  # attrOverride: modifies file attributes
  action: latency
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: database

  # Volume path to inject faults into
  volumePath: /var/lib/postgresql/data

  # Path pattern within the volume (supports wildcards)
  path: "/*"

  # Delay to add to IO operations
  delay: "100ms"

  # Percentage of IO operations to affect (0-100)
  percent: 50

  # Which IO operations to target
  # read, write, or both
  methods:
    - read
    - write

  duration: "5m"
```

### IO Fault Injection

```yaml
# io-fault-experiment.yaml
# Returns errors for specific IO operations
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-fault-example
  namespace: chaos-mesh
spec:
  action: fault
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: log-writer

  volumePath: /var/log/app

  # Specific files to target
  path: "/*.log"

  # Error number to return
  # 5 = EIO (Input/output error)
  # 28 = ENOSPC (No space left on device)
  # 13 = EACCES (Permission denied)
  errno: 28

  # Only affect write operations
  methods:
    - write

  # Percentage of operations to fail
  percent: 100

  duration: "2m"
```

## TimeChaos: Clock Skew Simulation

TimeChaos allows you to shift the system clock for specific containers, useful for testing time-sensitive logic.

### Time Offset Experiment

```yaml
# time-chaos-experiment.yaml
# Shifts the container's perceived time forward or backward
apiVersion: chaos-mesh.org/v1alpha1
kind: TimeChaos
metadata:
  name: time-skew-example
  namespace: chaos-mesh
spec:
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: scheduler-service

  # Time offset to apply
  # Positive values move time forward
  # Negative values move time backward
  # Format: [+-]?(\d+h)?(\d+m)?(\d+s)?
  timeOffset: "-2h30m"

  # Optional: only affect specific containers
  containerNames:
    - scheduler

  # Clock IDs to affect
  # CLOCK_REALTIME: wall clock time
  # CLOCK_MONOTONIC: time since boot
  clockIds:
    - CLOCK_REALTIME

  duration: "10m"
```

### Testing Certificate Expiration

```yaml
# cert-expiry-test.yaml
# Move time forward to test certificate expiration handling
apiVersion: chaos-mesh.org/v1alpha1
kind: TimeChaos
metadata:
  name: cert-expiry-test
  namespace: chaos-mesh
spec:
  mode: all

  selector:
    namespaces:
      - default
    labelSelectors:
      app: tls-service

  # Jump forward 90 days to test near-expiry behavior
  timeOffset: "2160h"

  clockIds:
    - CLOCK_REALTIME

  duration: "5m"
```

## Chaos Workflows: Orchestrating Complex Experiments

Workflows let you chain multiple chaos experiments together for comprehensive resilience testing.

### Serial Workflow

```yaml
# serial-workflow.yaml
# Runs chaos experiments one after another
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: serial-chaos-workflow
  namespace: chaos-mesh
spec:
  entry: serial-chaos
  templates:
    # Entry point template
    - name: serial-chaos
      templateType: Serial
      deadline: "30m"
      children:
        - network-delay
        - pod-failure
        - io-latency

    # Step 1: Network delay
    - name: network-delay
      templateType: NetworkChaos
      deadline: "5m"
      networkChaos:
        action: delay
        mode: all
        selector:
          namespaces:
            - default
          labelSelectors:
            app: my-app
        delay:
          latency: "200ms"
        duration: "3m"

    # Step 2: Pod failure
    - name: pod-failure
      templateType: PodChaos
      deadline: "5m"
      podChaos:
        action: pod-failure
        mode: one
        selector:
          namespaces:
            - default
          labelSelectors:
            app: my-app
        duration: "2m"

    # Step 3: IO latency
    - name: io-latency
      templateType: IOChaos
      deadline: "5m"
      ioChaos:
        action: latency
        mode: all
        selector:
          namespaces:
            - default
          labelSelectors:
            app: my-app
        volumePath: /data
        delay: "50ms"
        duration: "3m"
```

### Parallel Workflow

```yaml
# parallel-workflow.yaml
# Runs multiple chaos experiments simultaneously
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: parallel-chaos-workflow
  namespace: chaos-mesh
spec:
  entry: parallel-chaos
  templates:
    # Entry point running experiments in parallel
    - name: parallel-chaos
      templateType: Parallel
      deadline: "10m"
      children:
        - network-chaos
        - pod-chaos

    # Network chaos branch
    - name: network-chaos
      templateType: NetworkChaos
      deadline: "5m"
      networkChaos:
        action: loss
        mode: all
        selector:
          namespaces:
            - default
          labelSelectors:
            app: frontend
        loss:
          loss: "10"
        duration: "5m"

    # Pod chaos branch
    - name: pod-chaos
      templateType: PodChaos
      deadline: "5m"
      podChaos:
        action: pod-kill
        mode: one
        selector:
          namespaces:
            - default
          labelSelectors:
            app: backend
        duration: "5m"
```

### Conditional Workflow

```yaml
# conditional-workflow.yaml
# Workflow with conditional branching based on experiment status
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: conditional-workflow
  namespace: chaos-mesh
spec:
  entry: main
  templates:
    - name: main
      templateType: Serial
      children:
        - initial-chaos
        - check-and-continue

    - name: initial-chaos
      templateType: PodChaos
      deadline: "5m"
      podChaos:
        action: pod-failure
        mode: one
        selector:
          namespaces:
            - default
          labelSelectors:
            app: test-app
        duration: "2m"

    # Suspend allows manual approval before continuing
    - name: check-and-continue
      templateType: Suspend
      deadline: "1h"
```

## Chaos Mesh Dashboard

The Chaos Mesh Dashboard provides a web UI for managing experiments.

### Accessing the Dashboard

```bash
# Port-forward the dashboard service
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333

# Access at http://localhost:2333
```

### Enabling Dashboard Authentication

```yaml
# dashboard-rbac.yaml
# Create a service account for dashboard access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: chaos-dashboard-admin
  namespace: chaos-mesh
---
# Bind cluster-admin role (adjust for your security requirements)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: chaos-dashboard-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: chaos-dashboard-admin
    namespace: chaos-mesh
```

```bash
# Get the token for dashboard login
kubectl -n chaos-mesh create token chaos-dashboard-admin
```

### Dashboard Helm Configuration

```yaml
# values.yaml for dashboard customization
dashboard:
  # Enable the dashboard
  create: true

  # Security settings
  securityMode: true

  # Resource limits
  resources:
    limits:
      cpu: 500m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi

  # Ingress configuration
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - name: chaos.example.com
        paths:
          - /
    tls:
      - secretName: chaos-dashboard-tls
        hosts:
          - chaos.example.com
```

## Integrating with Observability

Chaos Mesh integrates well with observability tools to correlate chaos experiments with system behavior.

### Prometheus Metrics

Chaos Mesh exposes Prometheus metrics by default:

```yaml
# servicemonitor.yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: chaos-mesh
  namespace: chaos-mesh
  labels:
    app: chaos-mesh
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: controller-manager
  namespaceSelector:
    matchNames:
      - chaos-mesh
  endpoints:
    - port: http
      interval: 15s
      path: /metrics
```

### Key Metrics to Monitor

```promql
# Number of chaos experiments by type and status
chaos_mesh_experiments{namespace="default"}

# Duration of chaos experiments
chaos_mesh_experiment_duration_seconds

# Chaos daemon injection success rate
chaos_mesh_injections_total{result="success"} / chaos_mesh_injections_total

# Controller reconciliation latency
workqueue_work_duration_seconds_bucket{name="podchaos-controller"}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Chaos Mesh Overview",
    "panels": [
      {
        "title": "Active Experiments",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(chaos_mesh_experiments{status=\"Running\"})"
          }
        ]
      },
      {
        "title": "Experiments by Type",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by (kind) (chaos_mesh_experiments)"
          }
        ]
      },
      {
        "title": "Injection Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(chaos_mesh_injections_total{result=\"success\"}[5m])) / sum(rate(chaos_mesh_injections_total[5m])) * 100"
          }
        ]
      }
    ]
  }
}
```

### OneUptime Integration

Connect Chaos Mesh experiments with OneUptime for comprehensive incident correlation:

```yaml
# alert-webhook.yaml
# Configure alerts to notify OneUptime when chaos experiments start/end
apiVersion: v1
kind: ConfigMap
metadata:
  name: chaos-alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    receivers:
      - name: oneuptime
        webhook_configs:
          - url: 'https://oneuptime.com/api/webhook/chaos-events'
            send_resolved: true

    route:
      receiver: oneuptime
      routes:
        - match:
            alertname: ChaosExperimentStarted
          receiver: oneuptime
        - match:
            alertname: ChaosExperimentEnded
          receiver: oneuptime
```

```yaml
# prometheus-rules.yaml
# Alert rules for chaos experiments
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: chaos-mesh-alerts
  namespace: monitoring
spec:
  groups:
    - name: chaos-mesh
      rules:
        - alert: ChaosExperimentStarted
          expr: increase(chaos_mesh_experiments{status="Running"}[1m]) > 0
          labels:
            severity: info
          annotations:
            summary: "Chaos experiment started"
            description: "A new chaos experiment has begun in namespace {{ $labels.namespace }}"

        - alert: ChaosExperimentFailed
          expr: chaos_mesh_experiments{status="Failed"} > 0
          labels:
            severity: warning
          annotations:
            summary: "Chaos experiment failed"
            description: "Chaos experiment {{ $labels.name }} failed in namespace {{ $labels.namespace }}"
```

## Best Practices Summary

### Experiment Design

1. **Start small** - Begin with single-pod experiments before scaling up
2. **Use namespaces** - Isolate chaos experiments in non-production namespaces first
3. **Set durations** - Always define experiment duration to prevent runaway chaos
4. **Label selectors** - Use precise label selectors to target specific workloads

### Safety Measures

```yaml
# Always use annotations to protect critical workloads
apiVersion: v1
kind: Pod
metadata:
  name: critical-pod
  annotations:
    # This annotation prevents Chaos Mesh from targeting this pod
    chaos-mesh.org/inject: "false"
```

### Operational Guidelines

1. **Schedule experiments** - Run chaos experiments during business hours when teams can respond
2. **Monitor actively** - Always have observability dashboards open during experiments
3. **Document hypotheses** - Write down what you expect to happen before running experiments
4. **Review results** - Conduct post-experiment reviews to capture learnings
5. **Iterate gradually** - Increase experiment scope as confidence grows

### Security Considerations

```yaml
# Limit chaos mesh permissions with RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: chaos-engineer
  namespace: staging
rules:
  - apiGroups: ["chaos-mesh.org"]
    resources: ["podchaos", "networkchaos"]
    verbs: ["get", "list", "create", "delete"]
  # Explicitly deny IOChaos and TimeChaos in this role
```

### Checklist Before Running Chaos

- [ ] Experiment has a defined duration
- [ ] Target workloads are correctly identified
- [ ] Monitoring and alerting are in place
- [ ] Team is aware the experiment is running
- [ ] Rollback plan is documented
- [ ] Hypothesis is written down
- [ ] Non-critical namespaces are protected

---

Chaos engineering with Chaos Mesh transforms the unknown into the known. By systematically testing failure scenarios, you build confidence in your system's resilience and uncover weaknesses before they become incidents. Start with simple experiments, measure everything, and gradually increase the blast radius as your systems prove their resilience.

For comprehensive observability during chaos experiments, [OneUptime](https://oneuptime.com) provides unified monitoring, alerting, and incident management to correlate chaos events with system behavior.
