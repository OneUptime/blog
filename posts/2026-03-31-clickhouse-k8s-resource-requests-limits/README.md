# How to Configure ClickHouse Resource Requests and Limits on K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Resource Management, Container, Performance

Description: Learn how to set CPU and memory resource requests and limits for ClickHouse pods on Kubernetes to ensure stable, predictable performance.

---

Properly configuring resource requests and limits for ClickHouse on Kubernetes is critical for cluster stability. Without these settings, ClickHouse pods can consume all available node resources, causing other workloads to be evicted or the node itself to become unresponsive.

## Understanding Requests vs Limits

In Kubernetes, **requests** define the minimum resources guaranteed to a container, while **limits** define the maximum it can consume. For ClickHouse, which is memory-intensive, setting these correctly prevents OOM kills and CPU throttling.

- **Requests** affect scheduling - the pod is only placed on nodes with sufficient free resources
- **Limits** cap consumption - exceeding memory limits triggers an OOM kill

## Recommended Resource Configuration

A typical production ClickHouse deployment might look like this:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
spec:
  template:
    spec:
      containers:
        - name: clickhouse
          image: clickhouse/clickhouse-server:24.3
          resources:
            requests:
              memory: "8Gi"
              cpu: "2"
            limits:
              memory: "16Gi"
              cpu: "8"
```

## Tuning Memory Limits

ClickHouse has its own internal memory limit settings that should align with your Kubernetes limits. Set `max_memory_usage` in your ClickHouse config to roughly 75% of the container memory limit:

```xml
<clickhouse>
  <profiles>
    <default>
      <max_memory_usage>12884901888</max_memory_usage>
    </default>
  </profiles>
</clickhouse>
```

This gives ClickHouse a buffer so it shuts down queries gracefully before the container OOM killer fires.

## Using a Vertical Pod Autoscaler

For dynamic workloads, use the Vertical Pod Autoscaler (VPA) in recommendation mode to understand actual usage:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: clickhouse-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: clickhouse
  updatePolicy:
    updateMode: "Off"
```

Run it in `Off` mode first to gather recommendations without restarting pods.

## CPU Considerations

ClickHouse benefits from a high CPU limit since query execution is highly parallelized. However, setting CPU requests too low can cause throttling under load. A ratio of 1:4 (request:limit) for CPU is a reasonable starting point.

```bash
kubectl top pod -l app=clickhouse --containers
```

Use this command to monitor actual CPU and memory consumption before finalizing your values.

## Namespace Resource Quotas

Enforce cluster-wide guardrails with ResourceQuota:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: clickhouse-quota
  namespace: clickhouse
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "32Gi"
    limits.cpu: "32"
    limits.memory: "64Gi"
```

## Summary

Setting appropriate resource requests and limits for ClickHouse on Kubernetes prevents resource contention and OOM kills. Start by profiling actual usage with `kubectl top`, set memory limits with a buffer above ClickHouse's `max_memory_usage`, and use VPA in recommendation mode to refine your values over time.
