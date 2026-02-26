# How to Handle Environment-Specific Resource Limits in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management, Kustomize

Description: Learn how to configure environment-specific CPU and memory resource limits across dev, staging, and production using ArgoCD with Kustomize and Helm patterns.

---

Resource limits are one of the most common differences between environments. Dev environments need minimal resources to save cost, staging should approximate production for realistic testing, and production needs properly tuned limits to handle real traffic. Getting this right is critical - too low in production causes OOMKills and CPU throttling, too high in dev wastes money on your cluster. This guide shows how to manage environment-specific resource limits with ArgoCD.

## Why Resource Limits Differ By Environment

Each environment serves a different purpose, and the resource allocation should reflect that:

- **Dev**: Minimal resources. Single replicas. Low limits to keep cluster costs down while allowing developers to test functionality.
- **Staging**: Medium resources. Should mirror production topology (same number of services) but can use reduced replicas and limits.
- **Production**: Full resources. Properly sized based on actual traffic patterns, with headroom for spikes.

A typical mapping looks like this:

| Parameter | Dev | Staging | Production |
|---|---|---|---|
| CPU Request | 50m | 250m | 500m |
| CPU Limit | 200m | 500m | 1000m |
| Memory Request | 64Mi | 256Mi | 512Mi |
| Memory Limit | 256Mi | 512Mi | 1Gi |
| Replicas | 1 | 2 | 3-10 (HPA) |

## Using Kustomize Patches for Resource Limits

Start with conservative defaults in the base deployment:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: myregistry/my-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

Create a resource patch for each environment:

```yaml
# overlays/dev/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# overlays/staging/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# overlays/production/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

Reference the patch in each overlay's kustomization:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - path: resources-patch.yaml
```

## Using Kustomize Replicas Transformer

Kustomize has a built-in `replicas` transformer that simplifies replica count changes without needing a patch file:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
replicas:
  - name: my-app
    count: 3
patches:
  - path: resources-patch.yaml  # Still need a patch for CPU/memory
```

## Helm Values for Resource Limits

With Helm, resource limits are naturally parameterized through values files:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

Each environment gets its own values file:

```yaml
# values-dev.yaml
replicaCount: 1
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

```yaml
# values-production.yaml
replicaCount: 3
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "1"
    memory: 1Gi
```

## Adding HPA for Production Only

Production often needs horizontal pod autoscaling that dev and staging do not:

```yaml
# overlays/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

Include it only in the production overlay:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - hpa.yaml      # Only production gets an HPA
namespace: production
patches:
  - path: resources-patch.yaml
```

## Vertical Pod Autoscaler Recommendations

Use VPA in recommendation mode to determine the right resource limits for production:

```yaml
# Deploy VPA in recommendation mode to observe resource usage
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
    updateMode: "Off"  # Recommendation only, do not auto-update
```

Check the recommendations and update your resource patches accordingly:

```bash
# Get VPA recommendations
kubectl get vpa my-app-vpa -n production -o jsonpath='{.status.recommendation}'
```

## LimitRange for Environment-Wide Defaults

Set default resource limits for the entire namespace so that any workload missing explicit limits gets reasonable defaults:

```yaml
# overlays/dev/limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      type: Container
```

```yaml
# overlays/production/limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - default:
        cpu: "1"
        memory: 1Gi
      defaultRequest:
        cpu: 250m
        memory: 256Mi
      max:
        cpu: "4"
        memory: 4Gi
      type: Container
```

## ResourceQuota for Environment Budget Control

Control total resource consumption per environment with ResourceQuota:

```yaml
# overlays/dev/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: environment-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

```yaml
# overlays/production/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: environment-quota
spec:
  hard:
    requests.cpu: "32"
    requests.memory: 64Gi
    limits.cpu: "64"
    limits.memory: 128Gi
    pods: "100"
```

## Multi-Container Deployments

When your pod has multiple containers (sidecars, init containers), each needs environment-specific resources:

```yaml
# overlays/production/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      initContainers:
        - name: db-migrate
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
        - name: sidecar-proxy
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

## Monitoring Resource Usage After Deployment

After deploying with ArgoCD, monitor actual resource consumption to validate your limits are appropriate:

```bash
# Check current resource usage vs limits
kubectl top pods -n production --containers

# Check for OOMKill events
kubectl get events -n production --field-selector reason=OOMKilling

# Check for CPU throttling (requires cAdvisor metrics)
# Look for container_cpu_cfs_throttled_seconds_total in Prometheus
```

## Best Practices

Always set both requests and limits. Requests determine scheduling, limits prevent runaway containers. Skipping requests leads to scheduling issues, skipping limits leads to noisy neighbor problems.

Start low and increase. It is safer to begin with conservative limits and scale up based on monitoring data than to over-provision from the start.

Match your staging limits to a fraction of production. A common pattern is staging at 50% of production resources. This catches resource-related bugs without paying full production costs.

Use Guaranteed QoS class for critical production workloads by setting requests equal to limits. This prevents Kubernetes from evicting your pods during node pressure:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 500m      # Same as request = Guaranteed QoS
    memory: 512Mi   # Same as request = Guaranteed QoS
```

Review resource limits quarterly. Traffic patterns change, code changes affect resource usage, and what worked six months ago may not be optimal today. Use VPA recommendations and monitoring data to keep limits current.
