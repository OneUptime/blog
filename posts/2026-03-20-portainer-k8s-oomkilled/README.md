# How to Debug OOMKilled Pods in Portainer - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, OOMKilled, Memory, Debugging

Description: Diagnose and fix OOMKilled (Out of Memory) pod crashes in Kubernetes clusters managed through Portainer.

## Introduction

OOMKilled is one of the most common Kubernetes failure modes. When a container uses more memory than its limit, the Linux kernel may terminate it with an Out-of-Memory (OOM) kill. In Portainer, you'll see pods restarting repeatedly with the status `OOMKilled`. This guide explains how to identify memory leaks, set appropriate limits, and prevent OOM kills.

## Recognizing OOMKilled in Portainer

In Portainer's **Applications** view, OOMKilled pods show:
- Status: `OOMKilled` or `Error` with high restart count
- The restart count increments rapidly

```bash
# Confirm OOMKilled via CLI

kubectl get pods -n production
# NAME              READY   STATUS      RESTARTS   AGE
# my-app-abc123     0/1     OOMKilled   15         2h

kubectl describe pod my-app-abc123 -n production
# Look for:
# Last State: Terminated
#   Reason: OOMKilled
#   Exit Code: 137
```

Exit code 137 = 128 + 9 (SIGKILL). It commonly appears with OOM kills, but confirm `Reason: OOMKilled` in the pod status because exit code 137 only tells you the process was killed with `SIGKILL`.

## Step 1: Check Current Memory Limit

```bash
# Get the current memory limit
kubectl get pod my-app-abc123 -n production \
  -o jsonpath='{.spec.containers[0].resources.limits.memory}'

# Check the deployment's resource configuration
kubectl get deployment my-app -n production \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

In Portainer: **Applications > [App] > YAML** shows the deployed resource configuration.

## Step 2: View Memory Usage Before the Crash

```bash
# Current memory usage (if pod is still running between crashes)
kubectl top pod my-app-abc123 -n production

# View current per-container metrics (requires Metrics Server)
kubectl top pod my-app-abc123 -n production --containers

# For longer history, check Prometheus/Grafana if available
```

## Step 3: Get the Application's Memory Profile

```bash
# Check container logs for memory-related messages
kubectl logs my-app-abc123 -n production --previous

# For Java apps, look for heap dump indicators
kubectl logs my-app-abc123 -n production --previous | grep -Ei "heap|memory|oom"

# For Node.js apps
kubectl logs my-app-abc123 -n production --previous | grep -Ei "heap|javascript heap"
```

## Step 4: Increase Memory Limit

The immediate fix is to increase the memory limit:

```yaml
# deployment-patch.yaml
spec:
  template:
    spec:
      containers:
      - name: my-app
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "1Gi"   # Increased from 512Mi
            cpu: "500m"
```

```bash
kubectl patch deployment my-app -n production --patch-file deployment-patch.yaml

# Or patch inline
kubectl patch deployment my-app -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"my-app","resources":{"limits":{"memory":"1Gi"}}}]}}}}'
```

In Portainer: **Applications > [App] > Edit this application** lets you update the app's resource settings.

## Step 5: Fix the Root Cause - Memory Leaks

Increasing limits is a temporary fix. Find and fix the leak:

### For Java Applications

```yaml
# Set JVM heap size relative to container limits
env:
- name: JAVA_TOOL_OPTIONS
  value: "-Xms256m -Xmx768m -XX:MaxMetaspaceSize=128m"
# Or use container-aware settings (Java 11+)
- name: JAVA_TOOL_OPTIONS
  value: "-XX:MaxRAMPercentage=75.0"
```

### For Node.js Applications

```yaml
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=768"
```

### For Python Applications

```bash
# Profile a reproduction of the leaking code path in the container
kubectl exec -it my-app-abc123 -n production -- python3 -c "
import tracemalloc
tracemalloc.start()
# ... run the leaking code path here ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
"
```

## Step 6: Use Vertical Pod Autoscaler for Recommendations

```yaml
# vpa-recommender.yaml
# Requires Vertical Pod Autoscaler to be installed in the cluster
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Recommendation only, no auto-update
```

```bash
kubectl apply -f vpa-recommender.yaml

# After running for a while, get recommendations
kubectl describe vpa my-app-vpa -n production
# Look for:
# Recommendation:
#   Container Recommendations:
#     Container Name: my-app
#     Lower Bound: 200Mi
#     Target: 450Mi
#     Upper Bound: 700Mi
```

## Step 7: Set Up Memory Alerting

```yaml
# PrometheusRule for OOMKill alerts
# Requires Prometheus Operator-compatible CRDs and kube-state-metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: oomkill-alert
  namespace: monitoring
spec:
  groups:
  - name: oomkill
    rules:
    - alert: ContainerOOMKilled
      expr: |
        kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
      for: 0m
      labels:
        severity: warning
      annotations:
        summary: "Container OOMKilled: {{ $labels.container }} in {{ $labels.namespace }}"
        description: "Container {{ $labels.container }} was OOMKilled. Consider increasing memory limits."
```

## Memory Sizing Guidelines

| Application Type | Request | Limit |
|-----------------|---------|-------|
| Static web server | 32Mi | 128Mi |
| Node.js API | 128Mi | 512Mi |
| Java Spring Boot | 256Mi | 1Gi |
| Python Django | 128Mi | 512Mi |
| Redis | 100Mi | 200Mi |
| PostgreSQL | 256Mi | 1Gi |

## Conclusion

OOMKilled pods require a two-step response: immediately increase the memory limit to stop the crash loop, then investigate the root cause through log analysis and memory profiling. Language-specific JVM and Node.js heap settings are often the culprit. The VPA recommender provides data-driven sizing based on actual usage patterns. With proper memory limits and application configuration, OOMKilled events should become rare.
