# How to Configure Kubernetes Limit Ranges That Prevent Cost Overruns from Unbounded Resource Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Resource Management, LimitRange, Security

Description: Configure Kubernetes LimitRange policies to prevent accidental cost overruns by enforcing maximum resource requests and providing sensible defaults for containers that don't specify limits.

---

A single misconfigured pod requesting 100 CPU cores and 500 GB of memory can trigger expensive autoscaling events that drain your budget in hours. Without guardrails, developers can accidentally deploy resource-intensive workloads that consume far more capacity than intended. LimitRange policies provide those guardrails.

LimitRange is a Kubernetes admission controller that enforces minimum and maximum resource constraints at the namespace level. It validates resource requests and limits in pod specifications before they're admitted to the cluster. More importantly, it can inject default values for pods that don't specify resources, preventing the unbounded requests that lead to cost disasters.

## Understanding LimitRange Scope and Impact

LimitRange operates at the namespace level and applies to newly created pods. Existing pods are not affected when you create or modify a LimitRange. The policy validates containers, pods, and persistent volume claims against configured constraints.

Each LimitRange can specify multiple limit types: Container, Pod, and PersistentVolumeClaim. Container limits apply to individual containers. Pod limits apply to the sum of all container requests in a pod. PersistentVolumeClaim limits control storage resource requests.

When a pod creation request violates LimitRange constraints, the API server rejects it with a clear error message explaining which constraint was violated. This immediate feedback helps developers correct issues before deployment.

## Creating Basic LimitRange Policies

Start with conservative limits that prevent extreme resource requests while allowing reasonable workload sizes. These examples show production-ready configurations for different namespace types.

```yaml
# limitrange-production.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  # Container-level limits
  - type: Container
    # Maximum resources any single container can request
    max:
      cpu: "4"
      memory: "16Gi"
      ephemeral-storage: "10Gi"

    # Minimum resources required
    min:
      cpu: "50m"
      memory: "64Mi"
      ephemeral-storage: "1Gi"

    # Default limits applied if not specified
    default:
      cpu: "500m"
      memory: "512Mi"
      ephemeral-storage: "2Gi"

    # Default requests applied if not specified
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
      ephemeral-storage: "1Gi"

    # Maximum ratio between limit and request (prevents excessive overcommit)
    maxLimitRequestRatio:
      cpu: "4"
      memory: "2"

  # Pod-level limits (sum of all containers)
  - type: Pod
    max:
      cpu: "16"
      memory: "64Gi"
      ephemeral-storage: "50Gi"

  # PersistentVolumeClaim limits
  - type: PersistentVolumeClaim
    max:
      storage: "500Gi"
    min:
      storage: "1Gi"
```

Apply this configuration:

```bash
kubectl apply -f limitrange-production.yaml

# Verify the LimitRange was created
kubectl describe limitrange production-limits -n production
```

Now test the limits with different pod configurations:

```yaml
# test-pod-within-limits.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-within-limits
  namespace: production
spec:
  containers:
  - name: app
    image: nginx:latest
    resources:
      requests:
        cpu: "200m"
        memory: "256Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"
```

This pod should be accepted:

```bash
kubectl apply -f test-pod-within-limits.yaml
# Should succeed
```

Now try violating the limits:

```yaml
# test-pod-exceeds-limits.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-exceeds-limits
  namespace: production
spec:
  containers:
  - name: app
    image: nginx:latest
    resources:
      requests:
        cpu: "10"  # Exceeds max of 4 cores
        memory: "256Mi"
      limits:
        cpu: "20"
        memory: "1Gi"
```

This should be rejected:

```bash
kubectl apply -f test-pod-exceeds-limits.yaml
# Expected error: exceeds max resource limits
```

## Configuring Development vs Production Limits

Different environments need different constraints. Development environments should be more permissive to support experimentation, while production needs stricter controls.

```yaml
# limitrange-dev.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: development
spec:
  limits:
  - type: Container
    max:
      cpu: "8"  # More generous for dev workloads
      memory: "32Gi"
      ephemeral-storage: "20Gi"

    min:
      cpu: "10m"  # Lower minimum to allow tiny test containers
      memory: "32Mi"
      ephemeral-storage: "100Mi"

    default:
      cpu: "1"  # Higher defaults for better dev experience
      memory: "2Gi"
      ephemeral-storage: "5Gi"

    defaultRequest:
      cpu: "250m"
      memory: "512Mi"
      ephemeral-storage: "1Gi"

    # Allow more overcommit in dev
    maxLimitRequestRatio:
      cpu: "10"
      memory: "4"

  - type: Pod
    max:
      cpu: "32"  # Allow bigger pods for integration tests
      memory: "128Gi"
      ephemeral-storage: "100Gi"

---
# limitrange-staging.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: staging-limits
  namespace: staging
spec:
  limits:
  - type: Container
    # Staging mirrors production but slightly more permissive
    max:
      cpu: "6"
      memory: "24Gi"
      ephemeral-storage: "15Gi"

    min:
      cpu: "50m"
      memory: "64Mi"
      ephemeral-storage: "1Gi"

    default:
      cpu: "750m"
      memory: "1Gi"
      ephemeral-storage: "3Gi"

    defaultRequest:
      cpu: "150m"
      memory: "256Mi"
      ephemeral-storage: "1Gi"

    maxLimitRequestRatio:
      cpu: "6"
      memory: "3"

  - type: Pod
    max:
      cpu: "24"
      memory: "96Gi"
      ephemeral-storage: "75Gi"
```

Apply environment-specific limits:

```bash
# Create namespaces if they don't exist
kubectl create namespace development --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -

# Apply LimitRanges
kubectl apply -f limitrange-dev.yaml
kubectl apply -f limitrange-staging.yaml
```

## Preventing Cost Overruns with Smart Defaults

The most powerful LimitRange feature for cost control is automatic default injection. When developers don't specify resource requests, sensible defaults prevent unbounded resource allocation.

```yaml
# limitrange-cost-optimized.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cost-optimized-limits
  namespace: web-services
spec:
  limits:
  - type: Container
    # Conservative defaults minimize cost impact
    default:
      cpu: "200m"      # Small by default
      memory: "256Mi"
      ephemeral-storage: "1Gi"

    defaultRequest:
      cpu: "100m"      # Very conservative requests
      memory: "128Mi"
      ephemeral-storage: "500Mi"

    # Still allow scaling up when needed
    max:
      cpu: "2"
      memory: "8Gi"
      ephemeral-storage: "10Gi"

    # Prevent accidental tiny requests that cause OOM
    min:
      cpu: "50m"
      memory: "64Mi"
      ephemeral-storage: "100Mi"

    # Limit overcommit to prevent memory pressure
    maxLimitRequestRatio:
      cpu: "4"
      memory: "2"
```

Test default injection with a pod that specifies no resources:

```yaml
# test-pod-no-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-defaults
  namespace: web-services
spec:
  containers:
  - name: app
    image: nginx:latest
    # No resources specified - LimitRange will inject defaults
```

Deploy and verify defaults were applied:

```bash
kubectl apply -f test-pod-no-resources.yaml

# Check the actual resources assigned
kubectl get pod test-defaults -n web-services -o yaml | grep -A 6 resources:
# Should show the default values from LimitRange
```

## Handling Multi-Container Pods

Multi-container pods require special consideration. The pod-level limits should account for the sum of all containers, including init containers and sidecars.

```yaml
# limitrange-multi-container.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: multi-container-limits
  namespace: microservices
spec:
  limits:
  - type: Container
    max:
      cpu: "2"
      memory: "4Gi"

    default:
      cpu: "500m"
      memory: "512Mi"

    defaultRequest:
      cpu: "100m"
      memory: "128Mi"

  # Pod limit should be at least 3x container limit for typical 3-container pods
  - type: Pod
    max:
      cpu: "8"       # Allow up to 4 containers at max
      memory: "16Gi"

    # Minimum ensures at least one container can start
    min:
      cpu: "100m"
      memory: "128Mi"
```

Example multi-container pod that fits within these limits:

```yaml
# multi-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
  namespace: microservices
spec:
  containers:
  # Main application container
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1500m"
        memory: "2Gi"

  # Logging sidecar
  - name: log-collector
    image: fluent-bit:latest
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"

  # Metrics exporter sidecar
  - name: metrics
    image: prometheus-exporter:latest
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "100m"
        memory: "128Mi"

  # Total pod requests: 650m CPU, 1.19Gi memory (within limits)
  # Total pod limits: 1800m CPU, 2.38Gi memory (within limits)
```

## Implementing Graduated Limits by Team

Different teams may need different limits based on their workload characteristics. Use namespace labels and tooling to apply appropriate LimitRanges.

```bash
# create-team-namespaces.sh
#!/bin/bash

# Backend team - needs more resources
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
  labels:
    team: backend
    cost-tier: high
---
apiVersion: v1
kind: LimitRange
metadata:
  name: backend-limits
  namespace: team-backend
spec:
  limits:
  - type: Container
    max:
      cpu: "8"
      memory: "32Gi"
    default:
      cpu: "1"
      memory: "2Gi"
    defaultRequest:
      cpu: "250m"
      memory: "512Mi"
EOF

# Frontend team - lighter workloads
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: team-frontend
  labels:
    team: frontend
    cost-tier: medium
---
apiVersion: v1
kind: LimitRange
metadata:
  name: frontend-limits
  namespace: team-frontend
spec:
  limits:
  - type: Container
    max:
      cpu: "4"
      memory: "8Gi"
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
EOF

# Data science team - occasional large workloads
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: team-datascience
  labels:
    team: datascience
    cost-tier: variable
---
apiVersion: v1
kind: LimitRange
metadata:
  name: datascience-limits
  namespace: team-datascience
spec:
  limits:
  - type: Container
    max:
      cpu: "32"
      memory: "256Gi"
    default:
      cpu: "2"
      memory: "8Gi"
    defaultRequest:
      cpu: "500m"
      memory: "2Gi"
EOF
```

Make the script executable and run it:

```bash
chmod +x create-team-namespaces.sh
./create-team-namespaces.sh

# Verify each team has appropriate limits
kubectl describe limitrange -n team-backend
kubectl describe limitrange -n team-frontend
kubectl describe limitrange -n team-datascience
```

## Monitoring LimitRange Violations

Track how often LimitRanges reject pods to identify if your limits are too restrictive or if teams need education on proper resource specification.

```bash
# Check API server audit logs for LimitRange rejections
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep -i "limitrange" | \
  grep -i "forbidden"

# Count rejections by namespace
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep -i "limitrange.*forbidden" | \
  awk '{print $NF}' | \
  sort | uniq -c | sort -rn
```

Create alerts for excessive rejections:

```yaml
# prometheus-limitrange-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: limitrange-violations
  namespace: monitoring
spec:
  groups:
  - name: limitrange_alerts
    interval: 5m
    rules:
    - alert: HighLimitRangeRejectionRate
      expr: |
        rate(apiserver_admission_controller_admission_duration_seconds_count{
          name="LimitRanger",
          rejected="true"
        }[5m]) > 0.1
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "High rate of LimitRange rejections"
        description: "{{ $value }} pod creations per second are being rejected by LimitRange"
```

## Updating LimitRanges Without Disruption

Changing LimitRange policies only affects new pods. Existing pods continue running with their original resource specifications. To update running workloads:

```bash
# Update the LimitRange
kubectl apply -f limitrange-updated.yaml

# Force pod recreation to pick up new defaults
kubectl rollout restart deployment/myapp -n production

# Or for all deployments in a namespace
kubectl get deployments -n production -o name | \
  xargs -I {} kubectl rollout restart {} -n production
```

For critical services, use a gradual rollout:

```bash
# Restart deployments one at a time with verification
for deploy in $(kubectl get deploy -n production -o name); do
  echo "Restarting $deploy"
  kubectl rollout restart $deploy -n production
  kubectl rollout status $deploy -n production
  sleep 30  # Wait between restarts
done
```

## Combining LimitRange with ResourceQuota

LimitRange works best when combined with ResourceQuota for comprehensive cost control. LimitRange prevents individual pods from being too large, while ResourceQuota limits total namespace consumption.

```yaml
# combined-limits-quota.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: per-pod-limits
  namespace: shared-services
spec:
  limits:
  - type: Container
    max:
      cpu: "2"
      memory: "8Gi"
    default:
      cpu: "500m"
      memory: "1Gi"
    defaultRequest:
      cpu: "100m"
      memory: "256Mi"

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-total-quota
  namespace: shared-services
spec:
  hard:
    # Total namespace limits
    requests.cpu: "50"
    requests.memory: "100Gi"
    limits.cpu: "100"
    limits.memory: "200Gi"

    # Object count limits
    pods: "100"
    persistentvolumeclaims: "50"
    services.loadbalancers: "5"
```

This combination ensures individual pods can't be too large (LimitRange) and total namespace consumption stays within budget (ResourceQuota).

LimitRange policies are your first line of defense against runaway costs. By enforcing sensible defaults and maximum limits, you prevent accidental overprovisioning while still allowing workloads to scale when genuinely needed. Start with conservative limits based on your largest typical workloads and adjust based on rejection patterns and team feedback.
