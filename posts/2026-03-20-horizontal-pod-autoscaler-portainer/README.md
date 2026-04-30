# How to Configure Horizontal Pod Autoscaler via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, HPA, Autoscaling, Performance, Infrastructure

Description: Configure Kubernetes Horizontal Pod Autoscalers through Portainer's manifest interface to automatically scale deployments based on CPU, memory, or custom metrics.

---

The Horizontal Pod Autoscaler (HPA) automatically adjusts the number of pod replicas based on observed metrics. Portainer's Kubernetes manifest interface lets you deploy and manage HPA resources without switching to kubectl, keeping your scaling configuration alongside your other stack definitions.

## Prerequisites

- Portainer connected to a Kubernetes cluster
- An existing namespace to deploy into (the examples below use `production`)
- Metrics Server installed in the cluster (required for CPU/memory-based HPA)

```bash
# Install Metrics Server if not present

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Step 1: Deploy a Scalable Application

In Portainer, go to **Applications > Create from code**, choose **Manifest**, select the `production` namespace, and apply:

```yaml
# web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          image: my-registry/web-api:1.0.0
          ports:
            - containerPort: 8080
          resources:
            # Resource requests are required for utilization-based HPA targets
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

## Step 2: Create an HPA for CPU Scaling

Apply the following HPA manifest via Portainer's **Create from code** workflow:

```yaml
# web-api-hpa.yaml
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
  # Scale between 2 and 20 replicas
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          # Scale up when average CPU exceeds 60%
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 3: Custom Metrics HPA

For application-level metrics (requests per second, queue depth), use a metrics adapter that exposes the appropriate custom or external metrics API. The example below uses an external metric:

```yaml
# custom-metrics-hpa.yaml
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
          name: rabbitmq_queue_messages
          selector:
            matchLabels:
              queue: job-queue
        target:
          type: AverageValue
          # One worker per 5 queued messages
          averageValue: "5"
```

## Step 4: Monitor HPA Status in Portainer

Use Portainer's **kubectl shell** to inspect HPA status and see:

- Current vs desired replica count
- Current metric values vs targets
- Recent scaling events

Run:

```bash
kubectl get hpa -n production
kubectl describe hpa web-api-hpa -n production
```

## Step 5: Scaling Behavior Tuning

Add scaling behavior policies to prevent thrashing:

```yaml
spec:
  behavior:
    scaleDown:
      # Scale down gradually - reduce by 10% every 60 seconds
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
      stabilizationWindowSeconds: 300
    scaleUp:
      # Scale up quickly - allow doubling every 30 seconds
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
      stabilizationWindowSeconds: 0
```

## Summary

Portainer's manifest interface makes HPA management accessible without requiring kubectl fluency. By defining HPA resources alongside your Deployments and Services, you establish a self-documenting autoscaling configuration that scales your application automatically in response to real traffic patterns.
