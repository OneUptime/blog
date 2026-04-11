# How to Configure Redis Resource Limits in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Resource

Description: Learn how to configure Kubernetes resource requests and limits for Redis pods to ensure predictable performance, prevent OOM kills, and enable proper node scheduling.

---

Misconfigured resource limits are a common cause of Redis issues in Kubernetes. Too-low memory limits cause OOM kills, while missing limits allow Redis to consume unbounded node resources. This guide covers correct resource configuration for Redis pods.

## Understanding Requests vs Limits

```text
requests: Minimum resources guaranteed; used for scheduling decisions.
limits:   Maximum resources allowed; enforced by the kubelet.

Redis best practice:
  CPU limits:    Set request = limit for Guaranteed QoS class
                 (may cause throttling during bursts; trade-off for OOM protection)
  Memory limits: Set firmly (Redis must not be OOM killed unexpectedly)
  Memory request = Memory limit, CPU request = CPU limit (Guaranteed QoS class)
```

## Basic Resource Configuration

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "2Gi"   # request = limit for both resources = Guaranteed QoS
              cpu: "1000m"
          command:
            - redis-server
            - --maxmemory
            - "1500mb"        # keep 500MB headroom below container limit
            - --maxmemory-policy
            - volatile-lru
```

## The maxmemory and Container Limit Relationship

Always set `maxmemory` below the container memory limit:

```text
Container memory limit: 2 GiB (2048 MB)
Redis maxmemory:        1500 MB  (leave 548 MB for OS, buffers, fork overhead)

Rule of thumb: maxmemory = container_limit * 0.75
```

If Redis maxmemory equals the container limit, fork() for RDB saves may cause OOM kills.

Use a ConfigMap to set maxmemory explicitly:

```yaml
# redis-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    maxmemory 1500mb
    maxmemory-policy volatile-lru
    save 900 1
    appendonly yes
```

## Disable Transparent Huge Pages

Add an init container to disable THP (required for optimal Redis performance):

```yaml
initContainers:
  - name: disable-thp
    image: busybox
    command:
      - sh
      - -c
      - |
        echo never > /sys/kernel/mm/transparent_hugepage/enabled
        echo never > /sys/kernel/mm/transparent_hugepage/defrag
    securityContext:
      privileged: true
    volumeMounts:
      - name: sys
        mountPath: /sys
volumes:
  - name: sys
    hostPath:
      path: /sys
```

## LimitRange for Namespace Defaults

Set default resource limits for the Redis namespace:

```yaml
# redis-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: redis-limits
  namespace: redis
spec:
  limits:
    - type: Container
      default:
        memory: "2Gi"
        cpu: "1000m"
      defaultRequest:
        memory: "1Gi"
        cpu: "250m"
      max:
        memory: "16Gi"
        cpu: "4000m"
```

## Monitoring Resource Usage

```bash
# Check current resource usage
kubectl top pod -n redis

# Check resource requests vs limits
kubectl get pod redis-0 -n redis -o jsonpath='{.spec.containers[0].resources}'

# Watch for OOM events
kubectl get events -n redis --field-selector reason=OOMKilling

# Check QoS class
kubectl get pod redis-0 -n redis -o jsonpath='{.status.qosClass}'
# Should be: Guaranteed (if requests == limits for all resources)
```

## Summary

Redis Kubernetes resource limits should set memory requests equal to limits for Guaranteed QoS class, configure Redis `maxmemory` at 75% of the container limit to leave headroom for fork operations, and use a loose CPU limit to avoid throttling during bursty operations. Use init containers to disable Transparent Huge Pages and monitor with `kubectl top` and OOMKill events to tune your values over time.
