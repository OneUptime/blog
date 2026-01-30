# How to Create Kubernetes Limit Ranges

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Multi-tenancy, DevOps

Description: Configure LimitRange resources in Kubernetes to set default, minimum, and maximum resource constraints for containers and pods in namespaces.

---

When running workloads in Kubernetes, resource management becomes critical as your cluster grows. Without proper constraints, a single misbehaving pod can consume all available resources and starve other workloads. LimitRange objects provide namespace-level controls that enforce resource boundaries and set sensible defaults for containers and pods.

This guide walks through creating and configuring LimitRange resources for different use cases, from basic container constraints to advanced PersistentVolumeClaim limits.

## What is a LimitRange?

A LimitRange is a Kubernetes policy object that constrains resource allocations (CPU, memory, storage) within a namespace. It operates at the admission control level, meaning Kubernetes validates resource requests against the LimitRange before allowing pod creation.

LimitRange provides four key capabilities:

| Capability | Description |
|------------|-------------|
| Default values | Automatically inject resource requests and limits when not specified |
| Minimum constraints | Reject pods requesting fewer resources than the minimum |
| Maximum constraints | Reject pods requesting more resources than the maximum |
| Ratio enforcement | Ensure the ratio between limits and requests stays within bounds |

## LimitRange Resource Types

LimitRange supports three resource types, each targeting different Kubernetes objects:

| Type | Target | Constrained Resources |
|------|--------|----------------------|
| Container | Individual containers | CPU, memory |
| Pod | Sum of all containers in a pod | CPU, memory |
| PersistentVolumeClaim | Storage requests | Storage size |

## Creating Your First LimitRange

Let's start with a basic LimitRange that sets default CPU and memory values for containers.

The following manifest creates a LimitRange in the development namespace. It sets default resource limits and requests that apply when a container does not specify its own values.

```yaml
# basic-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: basic-limits
  namespace: development
spec:
  limits:
    - type: Container
      # Default limits applied when container has none specified
      default:
        cpu: "500m"
        memory: "512Mi"
      # Default requests applied when container has none specified
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
```

Apply the LimitRange to your cluster:

```bash
# Create the namespace first if it doesn't exist
kubectl create namespace development

# Apply the LimitRange
kubectl apply -f basic-limitrange.yaml

# Verify the LimitRange was created
kubectl describe limitrange basic-limits -n development
```

The output shows the applied constraints:

```
Name:       basic-limits
Namespace:  development
Type        Resource  Min  Max  Default Request  Default Limit  Max Limit/Request Ratio
----        --------  ---  ---  ---------------  -------------  -----------------------
Container   cpu       -    -    100m             500m           -
Container   memory    -    -    128Mi            512Mi          -
```

## Testing Default Value Injection

Deploy a pod without specifying any resource constraints to see the LimitRange defaults in action.

This pod definition has no resources block, so Kubernetes will inject the defaults from our LimitRange.

```yaml
# test-pod-no-resources.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-defaults
  namespace: development
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      # Note: No resources specified here
```

Create the pod and inspect its resource configuration:

```bash
kubectl apply -f test-pod-no-resources.yaml
kubectl get pod test-defaults -n development -o yaml | grep -A 10 resources
```

The output confirms that Kubernetes injected the default values:

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

## Setting Minimum and Maximum Constraints

Production environments often need strict boundaries. The following LimitRange enforces minimum and maximum resource values for containers.

This configuration prevents containers from requesting too few resources (which could cause performance issues) or too many resources (which could impact other workloads).

```yaml
# constrained-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-constraints
  namespace: production
spec:
  limits:
    - type: Container
      # Minimum resources a container can request
      min:
        cpu: "50m"
        memory: "64Mi"
      # Maximum resources a container can request
      max:
        cpu: "2"
        memory: "4Gi"
      # Defaults still apply when not specified
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "200m"
        memory: "256Mi"
```

Apply the configuration:

```bash
kubectl create namespace production
kubectl apply -f constrained-limitrange.yaml
```

### Validation Behavior

When you try to create a pod that violates the constraints, Kubernetes rejects it immediately.

This pod requests 8GB of memory, exceeding the 4Gi maximum defined in the LimitRange.

```yaml
# violation-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-hog
  namespace: production
spec:
  containers:
    - name: app
      image: nginx:1.25
      resources:
        requests:
          memory: "8Gi"
        limits:
          memory: "8Gi"
```

Attempting to create this pod produces an error:

```bash
kubectl apply -f violation-pod.yaml
```

```
Error from server (Forbidden): error when creating "violation-pod.yaml":
pods "memory-hog" is forbidden: maximum memory usage per Container is 4Gi,
but limit is 8Gi
```

## Pod-Level Constraints

Container-level limits apply to individual containers, but sometimes you need to constrain the total resources for an entire pod. Pod-type limits aggregate resource usage across all containers.

This LimitRange sets both container and pod level constraints. A pod with multiple containers must have a combined resource total below the pod maximum.

```yaml
# pod-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
  namespace: shared-services
spec:
  limits:
    # Container-level constraints
    - type: Container
      min:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "1"
        memory: "2Gi"
      default:
        cpu: "250m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
    # Pod-level constraints (sum of all containers)
    - type: Pod
      min:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
```

Apply and verify:

```bash
kubectl create namespace shared-services
kubectl apply -f pod-limitrange.yaml
kubectl describe limitrange pod-limits -n shared-services
```

### Multi-Container Pod Example

Consider a pod with three containers. The pod-level constraint ensures their combined resources stay within bounds.

This deployment runs a web server with two sidecar containers. Each container stays within container limits, and the total stays within pod limits.

```yaml
# multi-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-app
  namespace: shared-services
spec:
  containers:
    # Main application container
    - name: web-server
      image: nginx:1.25
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
    # Logging sidecar
    - name: log-shipper
      image: fluent/fluent-bit:2.1
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "200m"
          memory: "256Mi"
    # Metrics sidecar
    - name: metrics-exporter
      image: prom/node-exporter:v1.6.1
      resources:
        requests:
          cpu: "50m"
          memory: "64Mi"
        limits:
          cpu: "100m"
          memory: "128Mi"
```

Resource totals for this pod:

| Resource | Requests | Limits |
|----------|----------|--------|
| CPU | 650m | 1.3 |
| Memory | 704Mi | 1.384Gi |

Both totals fall within the pod-level maximum of 4 CPU and 8Gi memory.

## Ratio Constraints

The maxLimitRequestRatio field prevents resource overcommitment by limiting the ratio between a container's limits and requests. This is useful for ensuring quality of service and predictable scheduling.

A high limit-to-request ratio means a container might burst well beyond its guaranteed resources, potentially causing contention. A ratio of 2 means limits can be at most twice the requests.

```yaml
# ratio-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: ratio-limits
  namespace: controlled
spec:
  limits:
    - type: Container
      # Limits cannot exceed 2x the requests
      maxLimitRequestRatio:
        cpu: "2"
        memory: "2"
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "250m"
        memory: "256Mi"
```

### Valid vs Invalid Ratio Examples

The following table shows which resource configurations pass ratio validation:

| Requests | Limits | Ratio | Status |
|----------|--------|-------|--------|
| cpu: 250m | cpu: 500m | 2.0 | Valid |
| cpu: 250m | cpu: 400m | 1.6 | Valid |
| cpu: 250m | cpu: 600m | 2.4 | Rejected |
| memory: 256Mi | memory: 512Mi | 2.0 | Valid |
| memory: 256Mi | memory: 768Mi | 3.0 | Rejected |

A pod violating the ratio constraint:

```yaml
# ratio-violation.yaml
apiVersion: v1
kind: Pod
metadata:
  name: ratio-violator
  namespace: controlled
spec:
  containers:
    - name: app
      image: nginx:1.25
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          # This is 5x the request, violating the 2x ratio
          cpu: "500m"
          memory: "640Mi"
```

Error message:

```
Error from server (Forbidden): pods "ratio-violator" is forbidden:
cpu max limit to request ratio per Container is 2, but provided ratio is 5.000000
```

## PersistentVolumeClaim Constraints

LimitRange can also constrain storage requests for PersistentVolumeClaims. This prevents users from accidentally (or intentionally) requesting excessive storage.

This configuration limits PVC sizes between 1Gi and 100Gi.

```yaml
# pvc-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: data-services
spec:
  limits:
    - type: PersistentVolumeClaim
      min:
        storage: "1Gi"
      max:
        storage: "100Gi"
```

Apply and test:

```bash
kubectl create namespace data-services
kubectl apply -f pvc-limitrange.yaml
```

A PVC within the allowed range:

```yaml
# valid-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
  namespace: data-services
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
```

A PVC exceeding the maximum:

```yaml
# invalid-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: large-storage
  namespace: data-services
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Exceeds the 100Gi maximum
      storage: 500Gi
  storageClassName: standard
```

## Comprehensive LimitRange Configuration

For production environments, combine all constraint types into a single LimitRange. This example represents a balanced configuration for a multi-tenant namespace.

```yaml
# comprehensive-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: comprehensive-limits
  namespace: tenant-alpha
  labels:
    environment: production
    tenant: alpha
spec:
  limits:
    # Container constraints with full configuration
    - type: Container
      min:
        cpu: "25m"
        memory: "32Mi"
      max:
        cpu: "2"
        memory: "4Gi"
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      maxLimitRequestRatio:
        cpu: "4"
        memory: "4"

    # Pod constraints for aggregate limits
    - type: Pod
      min:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "8"
        memory: "16Gi"

    # PVC constraints
    - type: PersistentVolumeClaim
      min:
        storage: "1Gi"
      max:
        storage: "200Gi"
```

## Combining LimitRange with ResourceQuota

LimitRange and ResourceQuota work together for complete resource governance. LimitRange constrains individual objects, while ResourceQuota limits total namespace consumption.

The following configuration creates both resources for a development namespace with 5 developers.

First, the LimitRange sets per-container and per-pod constraints:

```yaml
# dev-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-team
spec:
  limits:
    - type: Container
      min:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "1"
        memory: "2Gi"
      default:
        cpu: "200m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
    - type: Pod
      max:
        cpu: "4"
        memory: "8Gi"
    - type: PersistentVolumeClaim
      min:
        storage: "1Gi"
      max:
        storage: "50Gi"
```

Then, the ResourceQuota limits total namespace resources:

```yaml
# dev-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team
spec:
  hard:
    # Compute resources
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"

    # Object counts
    pods: "50"
    persistentvolumeclaims: "20"

    # Storage
    requests.storage: "500Gi"
```

Apply both resources:

```bash
kubectl create namespace dev-team
kubectl apply -f dev-limitrange.yaml
kubectl apply -f dev-quota.yaml
```

### How They Work Together

| Aspect | LimitRange | ResourceQuota |
|--------|------------|---------------|
| Scope | Per object (container, pod, PVC) | Entire namespace |
| Enforcement | Admission time | Admission time |
| Default injection | Yes | No |
| Counts objects | No | Yes |

When a pod is created:

1. LimitRange injects defaults for missing resource specs
2. LimitRange validates min/max/ratio constraints
3. ResourceQuota checks if namespace has capacity
4. Pod is admitted or rejected

## Environment-Specific Configurations

Different environments have different resource needs. Here are recommended configurations for common scenarios.

### Development Environment

Smaller limits with generous defaults for quick iteration:

```yaml
# development-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: development
spec:
  limits:
    - type: Container
      min:
        cpu: "10m"
        memory: "16Mi"
      max:
        cpu: "500m"
        memory: "1Gi"
      default:
        cpu: "100m"
        memory: "128Mi"
      defaultRequest:
        cpu: "50m"
        memory: "64Mi"
    - type: PersistentVolumeClaim
      max:
        storage: "10Gi"
```

### Staging Environment

Closer to production with moderate constraints:

```yaml
# staging-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: staging-limits
  namespace: staging
spec:
  limits:
    - type: Container
      min:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "2"
        memory: "4Gi"
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "200m"
        memory: "256Mi"
      maxLimitRequestRatio:
        cpu: "3"
        memory: "3"
    - type: Pod
      max:
        cpu: "8"
        memory: "16Gi"
    - type: PersistentVolumeClaim
      min:
        storage: "1Gi"
      max:
        storage: "100Gi"
```

### Production Environment

Strict constraints with higher maximums for demanding workloads:

```yaml
# production-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
    - type: Container
      min:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "250m"
        memory: "256Mi"
      maxLimitRequestRatio:
        cpu: "2"
        memory: "2"
    - type: Pod
      min:
        cpu: "200m"
        memory: "256Mi"
      max:
        cpu: "16"
        memory: "32Gi"
    - type: PersistentVolumeClaim
      min:
        storage: "5Gi"
      max:
        storage: "500Gi"
```

## Managing LimitRanges with kubectl

Common operations for working with LimitRange objects:

```bash
# List all LimitRanges in a namespace
kubectl get limitrange -n production

# Get detailed information
kubectl describe limitrange production-limits -n production

# View LimitRange as YAML
kubectl get limitrange production-limits -n production -o yaml

# Delete a LimitRange
kubectl delete limitrange production-limits -n production

# Apply changes to an existing LimitRange
kubectl apply -f production-limits.yaml
```

## Troubleshooting Common Issues

### Pod Stuck in Pending

If pods remain in Pending state after LimitRange changes, check if existing resources violate new constraints:

```bash
# Check pod events for admission errors
kubectl describe pod <pod-name> -n <namespace>

# Look for LimitRange-related events
kubectl get events -n <namespace> --field-selector reason=FailedCreate
```

### Unexpected Default Values

When defaults are not being applied as expected:

```bash
# Verify the LimitRange configuration
kubectl describe limitrange -n <namespace>

# Check if multiple LimitRanges exist (they can conflict)
kubectl get limitrange -n <namespace>

# Inspect the actual values on a pod
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[*].resources}'
```

### Init Containers and LimitRange

Init containers are subject to LimitRange constraints separately from regular containers. However, pod-level limits consider the maximum of init container resources (not the sum, since they run sequentially).

```yaml
# init-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
  namespace: production
spec:
  initContainers:
    # Init container resources count toward pod limits
    - name: init-db
      image: busybox:1.36
      command: ['sh', '-c', 'echo Initializing...']
      resources:
        requests:
          cpu: "200m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
  containers:
    - name: app
      image: nginx:1.25
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
```

## Best Practices

**Set reasonable defaults**: Choose default values that work for most workloads in the namespace. This reduces the burden on developers to specify resources for every container.

**Use min constraints carefully**: Setting minimums too high can prevent legitimate small workloads from running. Start with low minimums and increase based on actual usage patterns.

**Monitor before enforcing maximums**: Analyze existing resource usage with tools like Prometheus and Grafana before setting max constraints. Arbitrary limits can break existing workloads.

**Document your constraints**: Add annotations or labels to LimitRange objects explaining the rationale for each constraint value.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: documented-limits
  namespace: production
  annotations:
    description: "Production limits based on Q3 capacity analysis"
    contact: "platform-team@company.com"
    last-reviewed: "2026-01-15"
```

**Test LimitRange changes in staging first**: Apply new constraints to a staging namespace and run your test suite before rolling out to production.

**Combine with ResourceQuota**: LimitRange prevents individual pods from being too large, but ResourceQuota prevents namespace exhaustion. Use both for complete coverage.

## Summary

LimitRange is an essential tool for Kubernetes resource governance. It provides:

- Default resource injection for containers without explicit resource specs
- Minimum constraints to ensure workloads have adequate resources
- Maximum constraints to prevent resource hogging
- Ratio enforcement to control overcommitment
- PVC size limits to manage storage allocation

When combined with ResourceQuota, LimitRange enables fine-grained control over cluster resources at both the individual object and namespace level. Start with permissive defaults in development environments and apply stricter constraints as you move toward production.

For large-scale multi-tenant clusters, consider using policy engines like Kyverno or Gatekeeper alongside LimitRange for more flexible and programmable resource policies.
