# How to Configure LimitRanges for Default Resource Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, LimitRange, Policy Enforcement, Best Practices

Description: Use LimitRanges to enforce default resource constraints, prevent resource hogging, and ensure consistent pod configurations across your cluster.

---

LimitRanges enforce resource constraints at the pod and container level within a namespace. They provide defaults for pods without explicit resource specifications and prevent individual containers from requesting excessive resources. This complements ResourceQuotas, which control aggregate namespace consumption.

## LimitRange vs ResourceQuota

ResourceQuotas limit total namespace resources. LimitRanges limit individual pod and container resources. Both work together:

```yaml
# ResourceQuota - namespace totals
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
---
# LimitRange - per-container constraints
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
spec:
  limits:
  - max:
      memory: "4Gi"
      cpu: "2000m"
    min:
      memory: "64Mi"
      cpu: "50m"
    default:
      memory: "256Mi"
      cpu: "200m"
    defaultRequest:
      memory: "128Mi"
      cpu: "100m"
    type: Container
```

The ResourceQuota prevents the namespace from exceeding 100 CPU and 200Gi memory. The LimitRange prevents any single container from requesting more than 4Gi memory or 2000m CPU, while providing defaults for containers without explicit resources.

## Setting Container Defaults

The most common use case is providing default resources for containers that do not specify them:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: development
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "250m"
    type: Container
```

When developers create pods without resource specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: myapp:v1
    # No resources specified
```

Kubernetes automatically injects the defaults:

```yaml
spec:
  containers:
  - name: app
    image: myapp:v1
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
      requests:
        memory: "256Mi"
        cpu: "250m"
```

This ensures all pods have resource specifications, which is required when ResourceQuotas are active.

## Enforcing Min and Max Limits

Prevent both under-provisioning and over-provisioning:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: constraints
  namespace: production
spec:
  limits:
  - max:
      memory: "8Gi"
      cpu: "4000m"
      ephemeral-storage: "20Gi"
    min:
      memory: "128Mi"
      cpu: "100m"
      ephemeral-storage: "1Gi"
    type: Container
```

Containers requesting less than min or more than max get rejected:

```bash
# This pod would be rejected
apiVersion: v1
kind: Pod
metadata:
  name: oversized
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "16Gi"  # Exceeds max
```

The API server returns an error explaining the limit violation.

## Request-to-Limit Ratios

Enforce maximum ratios between requests and limits:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: ratio-limits
  namespace: production
spec:
  limits:
  - maxLimitRequestRatio:
      memory: "2"
      cpu: "4"
    type: Container
```

This allows memory limits up to 2x the request and CPU limits up to 4x. Higher ratios lead to overcommitment and potential resource contention.

A pod with these resources would be accepted:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"  # 2x request - OK
    cpu: "2000m"   # 4x request - OK
```

This pod would be rejected:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"  # 4x request - exceeds ratio
    cpu: "2000m"
```

## Pod-Level Constraints

Beyond container limits, constrain entire pods:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
  namespace: production
spec:
  limits:
  - max:
      memory: "16Gi"
      cpu: "8000m"
    min:
      memory: "256Mi"
      cpu: "200m"
    type: Pod
```

The pod-level limit applies to the sum of all container requests and limits. This prevents pods with many containers from consuming excessive resources.

A pod with three containers each requesting 2Gi memory totals 6Gi, which passes this limit. A pod with ten containers requesting 2Gi each would exceed the limit and be rejected.

## PVC Storage Constraints

Limit persistent volume claim sizes:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: production
spec:
  limits:
  - max:
      storage: "100Gi"
    min:
      storage: "1Gi"
    type: PersistentVolumeClaim
```

This prevents teams from creating excessively large or small volumes. Combine with ResourceQuota storage limits for complete storage governance.

## Environment-Specific Configurations

Tailor LimitRanges to environment characteristics:

```yaml
# Development - permissive defaults
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: dev
spec:
  limits:
  - default:
      memory: "256Mi"
      cpu: "200m"
    defaultRequest:
      memory: "128Mi"
      cpu: "100m"
    max:
      memory: "2Gi"
      cpu: "1000m"
    type: Container
---
# Production - stricter constraints
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: prod
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "250m"
    max:
      memory: "8Gi"
      cpu: "4000m"
    min:
      memory: "128Mi"
      cpu: "100m"
    maxLimitRequestRatio:
      memory: "2"
      cpu: "2"
    type: Container
```

Development environments get smaller defaults and more relaxed constraints. Production enforces higher minimums and stricter ratios.

## Handling Init Containers

LimitRanges apply to init containers and regular containers equally:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
  - name: init
    image: busybox
    # Gets defaults from LimitRange
  containers:
  - name: app
    image: myapp:v1
    # Also gets defaults from LimitRange
```

If your init containers have different resource needs than app containers, specify resources explicitly rather than relying on defaults.

## Monitoring LimitRange Impact

Track how often LimitRanges modify or reject pods:

```bash
# View LimitRange objects
kubectl get limitrange -n production

# Check detailed configuration
kubectl describe limitrange defaults -n production
```

Unfortunately, Kubernetes does not expose metrics for LimitRange admission decisions. Monitor by watching pod creation failures:

```bash
# Watch for admission errors
kubectl get events -n production --field-selector reason=FailedCreate
```

Look for events mentioning limit violations. High rejection rates suggest limits are too restrictive.

## Testing LimitRange Configuration

Before applying LimitRanges to production, test with sample pods:

```bash
# Create test pod without resources
kubectl run test-pod --image=nginx -n production --dry-run=server -o yaml

# Check what resources would be applied
kubectl run test-pod --image=nginx -n production --dry-run=server -o yaml | \
  grep -A 10 resources
```

The dry-run shows the resources Kubernetes would assign after applying LimitRange defaults.

Test rejection scenarios:

```bash
# Try creating oversized pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: oversized-test
  namespace: production
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "100Gi"
EOF
```

Verify the expected rejection occurs with a clear error message.

## Common Pitfalls

Setting default limits without default requests creates pods with Guaranteed QoS unintentionally:

```yaml
# Problematic - only sets default limits
limits:
- default:
    memory: "512Mi"
    cpu: "500m"
  # Missing defaultRequest
  type: Container
```

Pods without explicit requests get the limits as requests too, creating Guaranteed QoS class. This wastes schedulable capacity.

Always set both:

```yaml
limits:
- default:
    memory: "512Mi"
    cpu: "500m"
  defaultRequest:
    memory: "256Mi"
    cpu: "250m"
  type: Container
```

Setting min too high blocks legitimate small workloads:

```yaml
# Too restrictive
limits:
- min:
    memory: "1Gi"
    cpu: "500m"
  type: Container
```

This prevents running lightweight sidecars or tools. Set min based on your actual smallest workload.

## Automated Policy Management

Use GitOps to manage LimitRanges consistently:

```yaml
# base-limitrange.yaml - template
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: ${NAMESPACE}
spec:
  limits:
  - default:
      memory: "${DEFAULT_MEMORY}"
      cpu: "${DEFAULT_CPU}"
    defaultRequest:
      memory: "${DEFAULT_MEMORY_REQUEST}"
      cpu: "${DEFAULT_CPU_REQUEST}"
    max:
      memory: "${MAX_MEMORY}"
      cpu: "${MAX_CPU}"
    min:
      memory: "${MIN_MEMORY}"
      cpu: "${MIN_CPU}"
    type: Container
```

Render with environment-specific values:

```bash
envsubst < base-limitrange.yaml | kubectl apply -f -
```

Track changes in Git for auditability and easy rollback.

## Integration with Admission Controllers

Combine LimitRanges with policy engines like OPA or Kyverno for advanced constraints:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-specs
spec:
  validationFailureAction: enforce
  rules:
  - name: check-resources
    match:
      resources:
        kinds:
        - Pod
    validate:
      message: "Containers must have resource requests and limits"
      pattern:
        spec:
          containers:
          - resources:
              requests:
                memory: "?*"
                cpu: "?*"
              limits:
                memory: "?*"
                cpu: "?*"
```

This policy enforces that all containers have explicit resources, even before LimitRange defaults apply. Use policies for requirements beyond what LimitRanges support.

LimitRanges provide essential guardrails for resource management. They prevent common mistakes, enforce organizational standards, and enable safe cluster sharing without requiring developers to be Kubernetes experts.
