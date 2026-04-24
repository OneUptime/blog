# How to Configure Horizontal Pod Autoscaler via Portainer - K8s Hpa

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, HPA, Autoscaling, Performance

Description: Configure Kubernetes Horizontal Pod Autoscaler to automatically scale deployments based on CPU, memory, or custom metrics via Portainer.

## Introduction

The Horizontal Pod Autoscaler (HPA) automatically scales the number of pods in a Deployment, StatefulSet, or ReplicaSet based on observed metrics. Portainer's Kubernetes interface allows deploying and monitoring HPA configurations through YAML manifests.

## Prerequisites

- Kubernetes cluster with Metrics Server installed
- Portainer managing the cluster
- Deployments with resource requests defined
- Prometheus Adapter or another custom/external metrics adapter if using custom metrics

## Installing Metrics Server

```bash
# Install Metrics Server (required for HPA)

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify Metrics Server is running
kubectl -n kube-system get pods -l k8s-app=metrics-server

# Test metrics are available
kubectl top nodes
kubectl top pods -n production
```

## Basic CPU-Based HPA

```yaml
# hpa-cpu.yml - deploy via Portainer
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 2  # Initial replicas (HPA will adjust this)
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
      - name: api
        image: myapp:latest
        resources:
          requests:
            cpu: "200m"      # MUST be set for CPU-based HPA
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Target avg CPU utilization of 70%
```

## Multi-Metric HPA (CPU + Memory)

```yaml
# hpa-multi-metric.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: 2
  maxReplicas: 30
  metrics:
  # Scale on CPU utilization
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Scale on average memory usage
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: "400Mi"  # Target avg memory usage of 400Mi per pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100          # Double pods in one step
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # 5-minute stabilization window
      policies:
      - type: Percent
        value: 25           # Remove 25% per 5 minutes
        periodSeconds: 300
```

## Custom Metrics HPA (Prometheus Adapter)

```yaml
# custom-metrics-hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
  # Scale based on queue depth (from Prometheus)
  - type: Pods
    pods:
      metric:
        name: queue_depth_per_pod
      target:
        type: AverageValue
        averageValue: "100"  # Target 100 queued items per pod
  # External metric (from external system)
  - type: External
    external:
      metric:
        name: sqs_queue_messages
        selector:
          matchLabels:
            queue: my-task-queue
      target:
        type: AverageValue
        averageValue: "50"
```

## Monitoring HPA in Portainer

```bash
# View HPA status via kubectl
kubectl get hpa -n production
# NAME          REFERENCE                 TARGETS     MINPODS   MAXPODS   REPLICAS   AGE
# web-api-hpa   Deployment/web-api/scale  68% / 70%  2         20        4          1h

# Detailed HPA status
kubectl describe hpa web-api-hpa -n production

# Via Portainer API
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/apis/autoscaling/v2/namespaces/production/horizontalpodautoscalers" \
  | python3 -c "
import sys, json
hpas = json.load(sys.stdin)
for h in hpas['items']:
    name = h['metadata']['name']
    min_r = h['spec']['minReplicas']
    max_r = h['spec']['maxReplicas']
    current = h['status'].get('currentReplicas', 0)
    desired = h['status'].get('desiredReplicas', 0)
    print(f'{name}: {current}/{desired} (min: {min_r}, max: {max_r})')
"
```

## HPA Best Practices

```yaml
# Well-configured HPA with all best practices
spec:
  minReplicas: 2          # Keep baseline capacity for availability
  maxReplicas: 50         # Prevent runaway scaling
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65  # Leave 35% headroom for spikes
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Prevent thrashing
```

## Conclusion

Horizontal Pod Autoscaler configured via Portainer enables Kubernetes workloads to automatically handle varying load. Resource-based scaling handles most use cases, while custom metrics enable business-logic-aware scaling (e.g., queue depth). Always set proper resource requests on containers before enabling HPA, and configure scale-down stabilization windows to prevent rapid replica count oscillation.
