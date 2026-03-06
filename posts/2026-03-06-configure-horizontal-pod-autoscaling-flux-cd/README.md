# How to Configure Horizontal Pod Autoscaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Horizontal Pod Autoscaler, HPA, GitOps, Autoscaling

Description: Learn how to manage Horizontal Pod Autoscalers through Flux CD for automated, GitOps-driven scaling of your Kubernetes workloads.

---

## Introduction

Horizontal Pod Autoscaling (HPA) automatically adjusts the number of pod replicas based on observed metrics such as CPU utilization, memory usage, or custom metrics. When managed through Flux CD, your autoscaling policies become version-controlled, auditable, and consistently applied across clusters.

This guide covers everything from basic CPU-based autoscaling to advanced custom metrics configurations, all managed through Flux CD.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- Metrics Server installed in the cluster
- kubectl access to the cluster

## Repository Structure

Organize your HPA manifests alongside the workloads they scale:

```yaml
# Repository layout
# infrastructure/
#   autoscaling/
#     base/
#       kustomization.yaml
#       web-app-hpa.yaml
#       api-server-hpa.yaml
#     production/
#       kustomization.yaml
#     staging/
#       kustomization.yaml
```

## Flux Kustomization for HPAs

```yaml
# clusters/my-cluster/autoscaling.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: autoscaling
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/autoscaling/production
  prune: true
  wait: true
  # HPAs should be created after deployments exist
  dependsOn:
    - name: apps
```

## Basic CPU-Based HPA

Scale your application based on CPU utilization:

```yaml
# infrastructure/autoscaling/base/web-app-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  # Define scaling boundaries
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          # Scale when average CPU exceeds 70%
          type: Utilization
          averageUtilization: 70
```

## Memory-Based HPA

Scale based on memory consumption:

```yaml
# infrastructure/autoscaling/base/worker-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          # Scale when average memory exceeds 80%
          type: Utilization
          averageUtilization: 80
```

## Multi-Metric HPA

Combine CPU and memory metrics for more intelligent scaling:

```yaml
# infrastructure/autoscaling/base/api-server-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 30
  metrics:
    # Scale on CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
    # Also scale on memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75
```

## Custom Metrics HPA

Use application-specific metrics from Prometheus for scaling decisions:

```yaml
# infrastructure/autoscaling/base/queue-worker-hpa.yaml
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
  minReplicas: 2
  maxReplicas: 50
  metrics:
    # Scale based on queue depth from Prometheus
    - type: Pods
      pods:
        metric:
          name: rabbitmq_queue_messages_ready
        target:
          # Scale when average messages per pod exceeds 100
          type: AverageValue
          averageValue: "100"
```

## External Metrics HPA

Scale based on metrics external to the cluster:

```yaml
# infrastructure/autoscaling/base/external-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sqs-worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sqs-worker
  minReplicas: 1
  maxReplicas: 25
  metrics:
    # Scale based on AWS SQS queue length
    - type: External
      external:
        metric:
          name: sqs_queue_length
          selector:
            matchLabels:
              queue: order-processing
        target:
          type: AverageValue
          averageValue: "30"
```

## Scaling Behavior Configuration

Fine-tune how quickly the HPA scales up and down:

```yaml
# infrastructure/autoscaling/base/controlled-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: controlled-scaling-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      # Aggressive scale-up for handling traffic spikes
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          # Double the pods every 60 seconds if needed
          periodSeconds: 60
        - type: Pods
          value: 5
          # Add at least 5 pods per scaling event
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      # Conservative scale-down to prevent flapping
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          # Remove at most 10% of pods per 60 seconds
          periodSeconds: 60
      selectPolicy: Min
```

## Environment-Specific Overlays

Customize HPA settings per environment:

```yaml
# infrastructure/autoscaling/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - web-app-hpa.yaml
  - api-server-hpa.yaml
  - worker-hpa.yaml
```

```yaml
# infrastructure/autoscaling/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: HorizontalPodAutoscaler
      name: web-app-hpa
    patch: |
      - op: replace
        path: /spec/minReplicas
        # Production needs higher minimum replicas
        value: 5
      - op: replace
        path: /spec/maxReplicas
        value: 50
```

```yaml
# infrastructure/autoscaling/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: HorizontalPodAutoscaler
      name: web-app-hpa
    patch: |
      - op: replace
        path: /spec/minReplicas
        # Staging uses fewer resources
        value: 1
      - op: replace
        path: /spec/maxReplicas
        value: 5
```

## Coordinating HPA with Deployment Replicas

When using HPA, avoid setting replicas in the Deployment manifest to prevent conflicts with Flux:

```yaml
# apps/web-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  # Do NOT set replicas here when using HPA
  # Let the HPA controller manage replica count
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: web-app:v1.2.0
          resources:
            # Resource requests are required for CPU/memory-based HPA
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Monitoring HPA with Flux Notifications

Set up alerts for autoscaling events:

```yaml
# clusters/my-cluster/hpa-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: hpa-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: autoscaling
      namespace: flux-system
  # Only alert on specific events
  inclusionList:
    - ".*reconcil.*"
```

## Verifying HPA Configuration

After Flux applies your HPAs, verify them:

```bash
# List all HPAs
kubectl get hpa --all-namespaces

# Check detailed HPA status including current metrics
kubectl describe hpa web-app-hpa -n production

# Watch HPA scaling in real-time
kubectl get hpa web-app-hpa -n production -w

# Check Flux reconciliation
flux get kustomizations autoscaling
```

## Best Practices

1. Always set resource requests on containers when using resource-based metrics
2. Use `behavior` fields to control scaling velocity and prevent flapping
3. Set reasonable `minReplicas` to handle baseline traffic without cold starts
4. Avoid setting `replicas` in Deployment manifests when HPA is active
5. Use percentage-based scaling policies for large deployments
6. Test HPA behavior in staging with load testing tools before production

## Conclusion

Managing Horizontal Pod Autoscalers through Flux CD provides a robust, GitOps-driven approach to scaling. By version-controlling your HPA configurations, you gain auditability, reproducibility, and the ability to manage scaling policies across multiple environments consistently. Combine HPAs with Pod Disruption Budgets for a comprehensive availability strategy.
