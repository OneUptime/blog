# How to Set Up Redis Horizontal Pod Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Autoscaling

Description: Learn how to set up horizontal pod autoscaling for Redis read replicas in Kubernetes using custom metrics from Prometheus to scale based on connection count and throughput.

---

Redis primary instances cannot be horizontally autoscaled (they are stateful and write-singleton), but read replicas can scale out to handle increased read traffic. This guide covers HPA for Redis read replicas using Prometheus custom metrics.

## What Can Be Autoscaled

```text
Redis primary:     Cannot HPA - stateful, single writer
Redis replicas:    CAN HPA - scale out for read scaling
Redis Sentinel:    Should be fixed at odd number (3 or 5)
Redis Cluster:     Can scale shard count, but requires cluster resharding
```

## Setting Up Prometheus Adapter

Install the Prometheus Adapter for custom metrics:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus.monitoring.svc \
  --set prometheus.port=9090
```

## Custom Metrics Configuration

Configure the adapter to expose Redis metrics:

```yaml
# prometheus-adapter-config.yaml
rules:
  custom:
    - seriesQuery: 'redis_connected_clients{kubernetes_namespace!="",kubernetes_pod_name!=""}'
      resources:
        overrides:
          kubernetes_namespace:
            resource: namespace
          kubernetes_pod_name:
            resource: pod
      name:
        matches: "^redis_connected_clients"
        as: "redis_connected_clients"
      metricsQuery: 'avg(redis_connected_clients{<<.LabelMatchers>>})'

    - seriesQuery: 'redis_commands_processed_total{kubernetes_namespace!=""}'
      resources:
        overrides:
          kubernetes_namespace:
            resource: namespace
      name:
        matches: "^.*"
        as: "redis_ops_per_second"
      metricsQuery: 'sum(rate(redis_commands_processed_total{<<.LabelMatchers>>}[2m]))'
```

## Redis Replica Deployment for Scaling

Deploy read replicas as a separate Deployment (not StatefulSet) for HPA:

```yaml
# redis-replica-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-replica
  namespace: redis
spec:
  replicas: 2  # initial replica count
  selector:
    matchLabels:
      app: redis
      role: replica
  template:
    metadata:
      labels:
        app: redis
        role: replica
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command:
            - redis-server
            - --replicaof
            - redis-primary.redis.svc.cluster.local
            - "6379"
            - --requirepass
            - $(REDIS_PASSWORD)
            - --masterauth
            - $(REDIS_PASSWORD)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
          resources:
            requests:
              memory: "2Gi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
```

## HorizontalPodAutoscaler

Scale based on connected clients:

```yaml
# redis-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: redis-replica-hpa
  namespace: redis
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: redis-replica
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: redis_connected_clients
        target:
          type: AverageValue
          averageValue: "50"  # scale when avg > 50 clients per pod
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # slow scale-down to prevent thrashing
```

## Verifying Autoscaling

```bash
# Check HPA status
kubectl get hpa -n redis

# Watch scaling events
kubectl describe hpa redis-replica-hpa -n redis

# Check current metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/redis/pods/*/redis_connected_clients"

# Monitor replicas
watch kubectl get pods -n redis -l role=replica
```

## Summary

Redis horizontal pod autoscaling applies to read replicas, not primary instances. Deploy replicas as a Deployment, use Prometheus Adapter to expose connection count and ops/sec as custom metrics, and configure HPA with appropriate stabilization windows to prevent scaling thrash. Scale-down should be slower than scale-up (300s vs 60s window) to maintain connection stability during traffic reductions.
