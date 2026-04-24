# How to Configure Auto-Scaling for Kubernetes Apps in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Auto-Scaling, HPA, DevOps

Description: Learn how to configure Horizontal Pod Autoscaling (HPA) for Kubernetes applications in Portainer to handle variable workloads automatically.

## Introduction

Horizontal Pod Autoscaling (HPA) automatically adjusts the number of pod replicas in a deployment based on observed CPU or memory utilization, or custom/external metrics. Portainer provides a UI for configuring HPA when deploying applications. This guide covers setting up auto-scaling for Kubernetes applications.

## Prerequisites

- Portainer with Kubernetes environment
- Metrics Server installed in the cluster (required for CPU/memory HPA in Portainer)
- Application with resource requests configured

## Step 1: Install Metrics Server (Required for CPU/Memory HPA)

HPA using CPU or memory metrics requires the Metrics API, typically provided by metrics-server:

```bash
# Install metrics-server

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system
kubectl top nodes    # Should work after metrics-server is ready
```

If your kubelet certificates are not signed by the cluster CA, metrics-server needs an extra flag:

```bash
# If using self-signed certificates, add --kubelet-insecure-tls
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

## Step 2: Configure Auto-Scaling in Portainer

When creating or editing an application:

1. Scroll to the **Auto-scaling** section
2. Toggle **Auto-scaling** to enabled
3. Configure:

```text
Min replicas:       2         (never go below this)
Max replicas:       10        (never exceed this)

Target CPU usage:   70        (maintain avg CPU around 70% of requests)
```

## Step 3: Configure HPA via YAML

```yaml
# Create the Deployment first
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: production
spec:
  replicas: 3    # Initial replica count before HPA adjusts it
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: api
          image: myapi:latest
          resources:
            requests:
              cpu: 200m       # Required for CPU-based HPA
              memory: 256Mi   # Required for memory-based HPA
            limits:
              cpu: 1000m
              memory: 512Mi

---
# Create the HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # CPU-based scaling
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70    # Scale when avg CPU > 70% of requests

    # Memory-based scaling
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80    # Scale when avg memory > 80% of requests

  # Behavior: control scale up/down speed
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60    # Smooth repeated scale-up decisions over 60s
      policies:
        - type: Percent
          value: 100        # Double the replicas at most per scale event
          periodSeconds: 60
        - type: Pods
          value: 4          # Add at most 4 pods per scale event
          periodSeconds: 60
      selectPolicy: Max     # Use whichever allows more scaling

    scaleDown:
      stabilizationWindowSeconds: 300   # Consider the last 5 min of recommendations before scaling down
      policies:
        - type: Percent
          value: 25         # Remove at most 25% of replicas per scale event
          periodSeconds: 60
```

## Step 4: Verify HPA Status

```bash
# Check HPA status
kubectl get hpa -n production

# Output:
# NAME          REFERENCE         TARGETS          MINPODS   MAXPODS   REPLICAS
# my-api-hpa    Deployment/my-api  45%/70%, 60%/80%    2        20        3

# Describe for more details
kubectl describe hpa my-api-hpa -n production
```

## Step 5: Monitor Auto-Scaling

```bash
# Watch HPA in real time
watch kubectl get hpa my-api-hpa -n production

# View scaling events
kubectl get events -n production --field-selector reason=SuccessfulRescale

# Output:
# 2024-01-15T10:00:00  Normal  SuccessfulRescale  my-api-hpa: New size: 5; reason: cpu resource utilization (percentage of request) above target
# 2024-01-15T10:30:00  Normal  SuccessfulRescale  my-api-hpa: New size: 3; reason: All metrics below target
```

## Step 6: Load Test to Verify Scaling

Test that HPA responds to load:

```bash
# Generate request load to trigger scale-up (assumes a Service named my-api exists)
kubectl run load-generator \
  --image=busybox:1.35 \
  --restart=Never \
  --namespace=production \
  -- sh -c "while true; do wget -q -O- http://my-api; done"

# Watch HPA respond
watch kubectl get hpa my-api-hpa -n production

# Clean up load generator
kubectl delete pod load-generator -n production
```

## Step 7: External Metrics HPA

For business-metric scaling (queue length, requests/second):

```yaml
# External metrics HPA (requires an adapter that exposes external.metrics.k8s.io)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
    - type: External
      external:
        metric:
          name: rabbitmq_queue_messages_ready
          selector:
            matchLabels:
              queue: job-queue
        target:
          type: AverageValue
          averageValue: "10"    # Scale to maintain 10 messages per worker
```

## Step 8: Vertical Pod Autoscaling (VPA)

If VPA is installed and you are not using HPA on the same CPU or memory metric, you can use it for automatically right-sizing resource requests:

```yaml
# VPA recommendation mode (doesn't auto-apply changes)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  updatePolicy:
    updateMode: "Off"    # "Off" for recommendations only
                         # Use "Recreate", "Initial", or "InPlaceOrRecreate" to apply changes automatically
```

```bash
# View recommendations
kubectl describe vpa my-api-vpa -n production
# Shows recommended cpu/memory requests
```

## Conclusion

Auto-scaling ensures your Kubernetes applications can handle variable workloads automatically without manual intervention. Portainer's HPA configuration UI makes it simple to set minimum/maximum replicas and target CPU usage without writing YAML. For production deployments, tune the scale-up and scale-down policies to balance responsiveness with stability, and monitor HPA events to understand scaling behavior over time.
