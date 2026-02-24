# How to Handle Istio Pod Eviction Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pod Eviction, Kubernetes, Troubleshooting, Resource Management

Description: How to diagnose and fix pod eviction issues caused by Istio sidecar resource consumption and prevent evictions with proper resource configuration.

---

Pod evictions happen when Kubernetes needs to reclaim resources on a node. When Istio sidecars are in the mix, they add to each pod's total resource consumption, making evictions more likely. A pod that was fine without a sidecar might suddenly get evicted because the Envoy proxy pushed its total memory over the node's threshold.

This guide covers how to identify Istio-related eviction issues, fix them, and prevent them from happening again.

## Understanding Pod Eviction

Kubernetes evicts pods in two main scenarios:

1. **Node resource pressure**: When a node runs low on memory, disk, or PIDs, the kubelet evicts pods based on QoS class and resource usage.
2. **Pod exceeds resource limits**: When a container (including the sidecar) exceeds its memory limit, it gets OOMKilled, which can trigger a pod restart or eviction.

Istio sidecars contribute to both scenarios by adding their resource consumption to every pod.

## Identifying Istio-Related Evictions

Check for eviction events:

```bash
# Find evicted pods
kubectl get pods -A --field-selector=status.phase=Failed | grep Evicted

# Check events for eviction reasons
kubectl get events -A --field-selector reason=Evicted --sort-by='.lastTimestamp'

# Check node conditions for resource pressure
kubectl describe nodes | grep -A 5 "Conditions:"
```

To see if the sidecar is contributing to evictions:

```bash
# Compare resource usage with and without sidecar
kubectl top pods -n my-namespace --containers

# Check if sidecars are using more memory than expected
kubectl top pods -A --containers | grep istio-proxy | sort -k4 -rn | head -20
```

## Common Eviction Scenarios

### Scenario 1: Node Memory Pressure from Sidecar Overhead

Each sidecar adds 64-256 MB of memory. On a node with 100 pods, that is 6-25 GB of extra memory consumption just from sidecars.

Diagnosis:

```bash
# Check node memory usage
kubectl top nodes

# Check total sidecar memory on a specific node
NODE_NAME="your-node-name"
kubectl get pods -A -o wide --field-selector spec.nodeName=$NODE_NAME | \
  awk '{print $1, $2}' | while read ns pod; do
    kubectl top pod $pod -n $ns --containers 2>/dev/null | grep istio-proxy
  done
```

Fix: Reduce per-sidecar memory:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            memory: 64Mi
          limits:
            memory: 128Mi
```

### Scenario 2: BestEffort Pods Getting Evicted First

Pods without resource requests and limits are classified as BestEffort QoS and are the first to be evicted. If your Istio sidecar has resource limits but the application container does not, the pod might still be BestEffort.

Diagnosis:

```bash
# Check QoS class of pods
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}: {.status.qosClass}{"\n"}{end}'
```

Fix: Make sure both the application container and the sidecar have resource requests and limits set. This gives the pod a Guaranteed or Burstable QoS class.

### Scenario 3: Sidecar Memory Spike During Configuration Push

When istiod pushes a large configuration update, sidecars temporarily consume more memory to parse and apply the new config. This spike can push pods over their memory limits.

Diagnosis:

```bash
# Check istiod push activity around the time of eviction
kubectl logs -n istio-system deploy/istiod --since=1h | grep "Push"

# Check sidecar memory around the push
kubectl exec -n my-namespace deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep server.memory_allocated
```

Fix: Increase the sidecar memory limit to accommodate spikes:

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "128Mi"
  sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

## Preventing Evictions

### Set Appropriate QoS Classes

For critical services, ensure pods get Guaranteed QoS by setting equal requests and limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

When requests equal limits for all containers, the pod gets Guaranteed QoS and is the last to be evicted.

### Use Priority Classes

Higher priority pods are evicted last:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-high
value: 100000
globalDefault: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
spec:
  template:
    spec:
      priorityClassName: production-high
```

### Set Pod Disruption Budgets

PDBs protect your services during voluntary disruptions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-service-pdb
  namespace: production
spec:
  minAvailable: "80%"
  selector:
    matchLabels:
      app: critical-service
```

### Node Resource Monitoring

Set up alerts for node resource pressure:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-resource-alerts
  namespace: monitoring
spec:
  groups:
  - name: node-resources
    rules:
    - alert: NodeMemoryPressure
      expr: |
        (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.instance }} has less than 10% memory available"
    - alert: HighSidecarMemoryOnNode
      expr: |
        sum(container_memory_working_set_bytes{container="istio-proxy"}) by (node)
        / on(node) kube_node_status_allocatable{resource="memory"} > 0.3
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecars consuming more than 30% of node memory"
```

## Reduce Sidecar Scope to Prevent Evictions

A major contributor to sidecar memory is the mesh configuration size. Restrict it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This default Sidecar resource for the namespace limits all sidecars to only know about services in their own namespace and istio-system. This can reduce per-sidecar memory by 50-80% in large meshes.

## Handling Eviction During Rolling Updates

During rolling updates, both old and new pods run simultaneously, doubling the resource usage temporarily. This can trigger evictions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
```

Keep `maxSurge` low to limit the temporary resource spike during deployments.

## Recovery After Mass Eviction

If many pods have been evicted, the recovery can cause a thundering herd:

```bash
# Check for pending pods
kubectl get pods -A --field-selector=status.phase=Pending

# Check if nodes have enough resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# If istiod is overwhelmed by reconnecting sidecars, check its health
kubectl top pod -n istio-system -l app=istiod
```

During recovery, istiod will see a burst of new sidecar connections. Make sure istiod has enough resources to handle this spike.

## Summary

Istio-related pod evictions happen because sidecars add memory and CPU consumption to every pod. The key preventive measures are: setting appropriate resource requests and limits on both sidecars and application containers to get the right QoS class, using priority classes for critical workloads, restricting sidecar scope to reduce memory footprint, and monitoring node-level resource usage to catch pressure early. When evictions do happen, check whether the sidecar's resource consumption was the tipping point and adjust limits accordingly.
