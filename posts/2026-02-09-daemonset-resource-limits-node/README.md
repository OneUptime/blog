# How to Configure DaemonSet Resource Limits for Preventing Node Resource Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Resource Management, QoS, Performance

Description: Learn how to set appropriate CPU and memory limits for DaemonSets to prevent node resource exhaustion while ensuring critical node-level services remain responsive under load.

---

DaemonSet pods run on every node, making resource management critical. Poorly configured limits can starve application workloads or cause DaemonSet pods to crash under load. This guide demonstrates setting appropriate resource requests and limits to balance reliability with resource efficiency.

## Understanding DaemonSet Resource Impact

Unlike Deployments that distribute replicas across nodes, DaemonSets place one pod per node. This means resource allocations multiply across your entire cluster. A DaemonSet requesting 500MB memory consumes 5GB in a 10-node cluster.

Resource configuration affects scheduling, QoS class, and eviction behavior. Requests determine scheduling feasibility. Limits trigger throttling (CPU) or OOMKills (memory). The ratio between them influences quality of service class.

## Setting Basic Resource Limits

Configure requests and limits for predictable resource usage:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: logging
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
          limits:
            cpu: 500m
            memory: 512Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

Requests guarantee available resources. Limits cap maximum usage. Setting limits higher than requests allows bursting while preventing resource monopolization.

## Implementing Guaranteed QoS

For critical system components, use Guaranteed QoS by setting requests equal to limits:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: kube-proxy
  template:
    metadata:
      labels:
        app: kube-proxy
    spec:
      priorityClassName: system-node-critical
      containers:
      - name: kube-proxy
        image: k8s.gcr.io/kube-proxy:v1.28.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

Guaranteed pods have the highest protection from eviction and receive their full CPU allocation.

## Configuring Burstable QoS for Flexibility

Most DaemonSets benefit from Burstable QoS:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        resources:
          requests:
            cpu: 50m
            memory: 100Mi
          limits:
            cpu: 200m
            memory: 200Mi
```

Burstable allows using extra resources when available while maintaining baseline guarantees through requests.

## Preventing Memory Leaks

Implement memory limits to prevent runaway processes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: custom-agent
  template:
    metadata:
      labels:
        app: custom-agent
    spec:
      containers:
      - name: agent
        image: custom-agent:latest
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

Combined with health probes, limits contain damage from memory leaks by killing and restarting affected pods.

## Configuring CPU Throttling Behavior

Understand CPU limit implications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cpu-throttling-guide
  namespace: documentation
data:
  guide.md: |
    # CPU Throttling Behavior

    ## No Limits
    - Pod can use all available CPU
    - Risk: Can starve other workloads

    ## With Limits
    - CPU usage capped at limit
    - Throttling occurs when limit reached
    - No process termination (unlike memory)

    ## Best Practices
    - Set limits 2-5x requests for burstable behavior
    - Monitor throttling metrics
    - Increase limits if persistent throttling detected
```

Monitor throttling:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cpu-throttling-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: cpu-throttling
      rules:
      - alert: DaemonSetCPUThrottling
        expr: |
          rate(container_cpu_cfs_throttled_seconds_total{pod=~".*daemonset.*"}[5m]) > 0.25
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "DaemonSet pod {{ $labels.pod }} experiencing CPU throttling"
```

## Implementing ResourceQuota for Namespace Limits

Prevent DaemonSets from consuming excessive cluster resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: monitoring-quota
  namespace: monitoring
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "30"
    limits.memory: 40Gi
    pods: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: monitoring-limits
  namespace: monitoring
spec:
  limits:
  - max:
      cpu: "2"
      memory: 4Gi
    min:
      cpu: 50m
      memory: 64Mi
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    type: Container
```

## Calculating Appropriate Limits

Measure actual usage to set realistic limits:

```bash
# Get current resource usage
kubectl top pods -n monitoring -l app=node-exporter

# Get detailed metrics over time
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/monitoring/pods/node-exporter-abc123 | jq '.containers[].usage'

# Calculate percentile usage across all pods
kubectl top pods -n monitoring -l app=log-collector --no-headers | \
  awk '{print $2}' | sort -n
```

Use historical data for sizing:

```yaml
# Prometheus query for 95th percentile memory usage
histogram_quantile(0.95,
  rate(container_memory_working_set_bytes{pod=~"log-collector.*"}[7d])
)

# Prometheus query for max CPU usage
max_over_time(
  rate(container_cpu_usage_seconds_total{pod=~"log-collector.*"}[5m])[7d:]
)
```

## Implementing Vertical Pod Autoscaler

Use VPA for automated limit recommendations:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: log-collector-vpa
  namespace: logging
spec:
  targetRef:
    apiVersion: apps/v1
    kind: DaemonSet
    name: log-collector
  updatePolicy:
    updateMode: "Off"  # Recommendation only
  resourcePolicy:
    containerPolicies:
    - containerName: fluentd
      minAllowed:
        cpu: 50m
        memory: 100Mi
      maxAllowed:
        cpu: 1000m
        memory: 2Gi
```

Query VPA recommendations:

```bash
kubectl describe vpa log-collector-vpa -n logging
```

## Handling Out of Memory Scenarios

Configure OOM behavior:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: memory-intensive-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: memory-agent
  template:
    metadata:
      labels:
        app: memory-agent
    spec:
      containers:
      - name: agent
        image: memory-agent:latest
        resources:
          requests:
            memory: 512Mi
          limits:
            memory: 1Gi
        env:
        - name: GOMEMLIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
              divisor: "1"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
          failureThreshold: 3
```

Monitor OOM kills:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oom-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: oom-monitoring
      rules:
      - alert: DaemonSetOOMKilled
        expr: |
          rate(kube_pod_container_status_terminated_reason{reason="OOMKilled",pod=~".*daemonset.*"}[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "DaemonSet pod {{ $labels.pod }} killed by OOM"
```

## Setting System Reserved Resources

Configure kubelet to reserve resources for system components:

```yaml
# kubelet-config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: 500m
  memory: 1Gi
  ephemeral-storage: 1Gi
kubeReserved:
  cpu: 100m
  memory: 512Mi
  ephemeral-storage: 1Gi
enforceNodeAllocatable:
- pods
- system-reserved
- kube-reserved
```

This ensures DaemonSets don't consume resources needed for system stability.

## Best Practices

Start with conservative limits and increase based on monitoring. Undersized limits cause crashes. Oversized limits waste resources across the entire cluster.

Set requests to typical usage and limits to peak usage plus buffer. This provides baseline guarantees while allowing reasonable bursts.

Use Guaranteed QoS for critical infrastructure like kube-proxy and CNI plugins. These components must remain stable regardless of cluster load.

Monitor actual resource usage continuously. Usage patterns change as traffic grows and configurations evolve.

Implement alerts for resource pressure, throttling, and OOM kills. Early detection prevents outages.

Test resource limits under load. Synthetic traffic reveals whether limits are adequate for peak conditions.

## Conclusion

Proper resource configuration for DaemonSets balances cluster efficiency with workload reliability. By setting appropriate requests and limits based on actual usage patterns, you prevent both resource waste and exhaustion. Combined with monitoring and QoS considerations, well-configured DaemonSets operate reliably across nodes while leaving resources for application workloads.

Implement thoughtful resource management to optimize DaemonSet performance and cluster stability.
