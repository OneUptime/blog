# How to Automate Container Scaling with Portainer and HPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, HPA, Autoscaling, Automation

Description: Configure automated container scaling using Kubernetes Horizontal Pod Autoscaler (HPA) and custom metrics with Portainer for managing scale-up and scale-down policies.

## Introduction

Manual container scaling creates operational toil: someone has to monitor CPU and memory metrics, then manually scale services during traffic spikes. Kubernetes Horizontal Pod Autoscaler (HPA) automates this by continuously adjusting pod counts based on resource metrics or custom application metrics. Portainer provides a visual interface to observe HPA behavior and configure scaling policies. This guide covers HPA configuration, custom metrics scaling, and KEDA for event-driven autoscaling.

## Understanding HPA Architecture

```text
Metrics Server → Collects CPU/Memory
     ↓
HPA Controller → Compares to targets
     ↓
Adjusts ReplicaCount → Deployment scales up/down
     ↓
Portainer → Shows current replicas and events
```

## Step 1: Install the Metrics Server

HPA requires the Kubernetes metrics server:

```bash
# Install metrics-server

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# For clusters with self-signed certificates
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# Verify it's working
kubectl top nodes
kubectl top pods -A
```

## Step 2: Create a Basic HPA

```yaml
# Deployment to scale
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx:alpine
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
---
# HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70   # Scale up when CPU > 70%
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80   # Scale up when memory > 80%
```

```bash
kubectl apply -f hpa.yaml

# Monitor HPA status (also visible in Portainer under Applications)
kubectl get hpa -n production -w
```

## Step 3: View HPA in Portainer

Navigate to **Applications** in Portainer and open the deployment. The application details show the current replica count and auto-scaling policy, and the **Events** tab shows application-related events.

```bash
# Describe HPA for detailed status
kubectl describe hpa web-app-hpa -n production

# Look for:
# Metrics: cpu resource utilization (percentage of request): 45% / 70%
# Min replicas: 2, Max replicas: 20
# Deployment pods: 2 current / 2 desired
```

## Step 4: Configure Custom Metrics HPA

Scale based on application metrics (e.g., requests per second) after configuring Prometheus Adapter to expose the metric through the custom metrics API:

```bash
# Install Prometheus Adapter for custom metrics
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.url=http://prometheus.monitoring.svc \
  --set prometheus.port=9090

# Verify the metric you want to use is exposed through the custom metrics API
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1"
```

```yaml
# Custom metrics HPA - scale on HTTP requests per second
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-custom-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"   # 100 req/s per pod target
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0    # Scale up immediately
      policies:
      - type: Percent
        value: 100    # Can double replicas per period
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scale down
      policies:
      - type: Percent
        value: 25     # Remove 25% at a time
        periodSeconds: 60
```

## Step 5: KEDA for Event-Driven Scaling

KEDA (Kubernetes Event-driven Autoscaling) scales based on queue depth, database queries, and more:

```bash
# Install KEDA
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

```yaml
# Scale workers based on Redis queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: worker-deployment
  minReplicaCount: 0     # Can scale to zero when queue is empty
  maxReplicaCount: 30
  triggers:
  - type: redis
    metadata:
      address: redis.production.svc.cluster.local:6379
      listName: job-queue
      listLength: "5"     # Scale up when queue > 5 items per worker
```

## Step 6: Load Test to Verify Scaling

```bash
# Generate load from a temporary Pod
kubectl run load-generator -i --tty --rm --image=busybox:1.28 --restart=Never -- \
  /bin/sh -c "while sleep 0.01; do wget -q -O- http://web-app.production.svc.cluster.local; done"

# In another terminal, watch HPA
kubectl get hpa web-app-hpa -n production -w
# NAME           REFERENCE          TARGETS   MINPODS   MAXPODS   REPLICAS
# web-app-hpa    Deployment/web-app 85%/70%   2         20        2 → 4 → 8
```

## Step 7: Scale-to-Zero with KEDA

```yaml
# Scale API to zero during off-hours using KEDA cron trigger
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: dev-api-schedule-scaler
  namespace: development
spec:
  scaleTargetRef:
    name: dev-api
  minReplicaCount: 0
  maxReplicaCount: 3
  triggers:
  - type: cron
    metadata:
      timezone: "America/New_York"
      start: "0 8 * * 1-5"    # Scale up weekday 8 AM
      end: "0 18 * * 1-5"     # End weekday scale window at 6 PM
      desiredReplicas: "3"
```

## HPA Troubleshooting

```bash
# HPA shows "unknown" for metrics
kubectl describe hpa web-app-hpa -n production
# Look for: "unable to get metrics for resource cpu" 
# Fix: Ensure metrics-server is running and pods have resource requests set

# HPA not scaling up despite high CPU
# Check: Does the pod have CPU requests set?
kubectl get pod <pod-name> -n production \
  -o jsonpath='{.spec.containers[0].resources.requests.cpu}'

# HPA oscillating (scaling up/down rapidly)
# Fix: Increase stabilizationWindowSeconds in behavior section
```

## Conclusion

Kubernetes HPA transforms container scaling from a manual operational task into an automatic, policy-driven process. Starting with CPU and memory-based scaling, then advancing to custom application metrics and KEDA for event-driven scaling, gives you fine-grained control over how your workloads respond to load. Portainer's application details view provides visibility into replica counts, auto-scaling policy, and related events, making it easy to monitor autoscaling behavior. The scale behaviors configuration prevents oscillation and ensures smooth scale-up and scale-down transitions.
