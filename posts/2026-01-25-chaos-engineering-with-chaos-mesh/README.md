# How to Configure Chaos Engineering with Chaos Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chaos Mesh, Chaos Engineering, Kubernetes, Resilience Testing, Fault Injection, Site Reliability

Description: Learn how to implement chaos engineering in Kubernetes using Chaos Mesh, including installation, experiment types, and building resilience workflows.

---

Chaos Mesh is a cloud-native chaos engineering platform for Kubernetes. Developed by PingCAP, it provides a web dashboard and a rich set of fault injection experiments. Unlike some chaos tools that require specific configurations, Chaos Mesh works with any Kubernetes cluster and supports fine-grained targeting.

## Why Chaos Mesh?

Chaos Mesh stands out for several reasons:
- Web-based dashboard for experiment management
- Extensive fault types (network, pod, stress, time, JVM)
- Fine-grained pod selection with labels and annotations
- Scheduled and workflow-based experiments
- Grafana integration for observability

## Installing Chaos Mesh

Install using Helm:

```bash
# Add the Chaos Mesh repository
helm repo add chaos-mesh https://charts.chaos-mesh.org

# Create namespace
kubectl create namespace chaos-mesh

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
  --set dashboard.securityMode=false

# For Docker runtime instead
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=docker \
  --set chaosDaemon.socketPath=/var/run/docker.sock
```

Verify installation:

```bash
# Check pods are running
kubectl get pods -n chaos-mesh

# Access the dashboard
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333
# Open http://localhost:2333
```

## Pod Chaos Experiments

### Pod Kill

Kill pods to test recovery:

```yaml
# pod-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: default
spec:
  action: pod-kill
  mode: one  # Kill one matching pod
  selector:
    namespaces:
      - default
    labelSelectors:
      app: nginx
  # Optional: schedule the experiment
  duration: "30s"
```

### Pod Failure

Make pods fail without killing them:

```yaml
# pod-failure.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-example
  namespace: default
spec:
  action: pod-failure
  mode: fixed-percent
  value: "50"  # Affect 50% of matching pods
  selector:
    namespaces:
      - default
    labelSelectors:
      app: api-server
  duration: "60s"
```

### Container Kill

Kill specific containers within pods:

```yaml
# container-kill.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: container-kill-example
  namespace: default
spec:
  action: container-kill
  mode: one
  containerNames:
    - sidecar  # Kill only the sidecar container
  selector:
    namespaces:
      - default
    labelSelectors:
      app: web
  duration: "30s"
```

## Network Chaos Experiments

### Network Delay

Add latency to network traffic:

```yaml
# network-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-example
  namespace: default
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: frontend
  delay:
    latency: "200ms"
    correlation: "25"  # 25% correlation with previous packet
    jitter: "50ms"     # Random variation
  direction: to
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: api
    mode: all
  duration: "5m"
```

### Network Partition

Isolate pods from each other:

```yaml
# network-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition-example
  namespace: default
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: service-a
  direction: both
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: service-b
    mode: all
  duration: "2m"
```

### Packet Loss

Simulate unreliable network:

```yaml
# packet-loss.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss-example
  namespace: default
spec:
  action: loss
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: database-client
  loss:
    loss: "30"       # 30% packet loss
    correlation: "25"
  direction: to
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: database
    mode: all
  duration: "3m"
```

### Bandwidth Limit

Restrict network bandwidth:

```yaml
# bandwidth-limit.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: bandwidth-limit-example
  namespace: default
spec:
  action: bandwidth
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: file-service
  bandwidth:
    rate: "1mbps"    # Limit to 1 Mbps
    limit: 100       # Queue size
    buffer: 10000    # Buffer size
  direction: to
  duration: "5m"
```

## Stress Chaos Experiments

### CPU Stress

Consume CPU resources:

```yaml
# cpu-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-example
  namespace: default
spec:
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: compute-service
  stressors:
    cpu:
      workers: 2      # Number of CPU stress workers
      load: 80        # Target 80% CPU usage
  duration: "5m"
```

### Memory Stress

Consume memory resources:

```yaml
# memory-stress.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress-example
  namespace: default
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: cache-service
  stressors:
    memory:
      workers: 1
      size: "500MB"   # Consume 500MB
  duration: "3m"
```

## IO Chaos Experiments

### IO Delay

Add latency to disk operations:

```yaml
# io-delay.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-delay-example
  namespace: default
spec:
  action: latency
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: database
  volumePath: /data
  path: /data/**
  delay: "100ms"
  percent: 50       # Affect 50% of operations
  duration: "5m"
```

### IO Error

Inject IO errors:

```yaml
# io-error.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-error-example
  namespace: default
spec:
  action: fault
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: storage-service
  volumePath: /data
  path: /data/cache/**
  errno: 5          # EIO error
  percent: 10       # 10% of operations fail
  duration: "3m"
```

## Time Chaos

Skew time for testing time-sensitive operations:

```yaml
# time-chaos.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: TimeChaos
metadata:
  name: time-skew-example
  namespace: default
spec:
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: scheduler
  timeOffset: "-2h"   # Move clock back 2 hours
  duration: "10m"
```

## Chaos Workflows

Chain multiple experiments:

```yaml
# chaos-workflow.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: resilience-test-workflow
  namespace: default
spec:
  entry: main
  templates:
    - name: main
      templateType: Serial
      children:
        - network-delay
        - wait-30s
        - pod-kill
        - wait-60s
        - cpu-stress

    - name: network-delay
      templateType: NetworkChaos
      networkChaos:
        action: delay
        mode: all
        selector:
          labelSelectors:
            app: api
        delay:
          latency: "100ms"
        duration: "2m"

    - name: wait-30s
      templateType: Suspend
      suspend:
        duration: "30s"

    - name: pod-kill
      templateType: PodChaos
      podChaos:
        action: pod-kill
        mode: one
        selector:
          labelSelectors:
            app: api

    - name: wait-60s
      templateType: Suspend
      suspend:
        duration: "60s"

    - name: cpu-stress
      templateType: StressChaos
      stressChaos:
        mode: all
        selector:
          labelSelectors:
            app: api
        stressors:
          cpu:
            workers: 1
            load: 70
        duration: "2m"
```

## Scheduled Experiments

Run chaos on a schedule:

```yaml
# scheduled-chaos.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: daily-pod-kill
  namespace: default
spec:
  schedule: "0 14 * * *"  # Daily at 2 PM
  type: PodChaos
  podChaos:
    action: pod-kill
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: api-server
  concurrencyPolicy: Forbid
```

## Monitoring Integration

Export metrics to Prometheus:

```bash
# Check Chaos Mesh metrics endpoint
kubectl port-forward -n chaos-mesh svc/chaos-daemon 31766:31766
curl http://localhost:31766/metrics
```

Grafana dashboard query examples:

```promql
# Active experiments
chaos_mesh_experiments{status="running"}

# Injected failures
rate(chaos_mesh_injected_count[5m])
```

## Best Practices

1. Start with non-production environments
2. Define clear success criteria before experiments
3. Use fine-grained selectors to limit blast radius
4. Monitor application metrics during experiments
5. Have rollback procedures ready
6. Document findings and improvements
7. Schedule regular chaos experiments
8. Review experiments in postmortems

---

Chaos Mesh provides a comprehensive toolkit for testing system resilience in Kubernetes. The web dashboard makes it accessible to teams new to chaos engineering, while the YAML-based experiments integrate well with GitOps workflows. Start small, observe carefully, and gradually increase the scope of your chaos experiments.
