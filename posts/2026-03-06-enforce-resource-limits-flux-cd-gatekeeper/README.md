# How to Enforce Resource Limits with Flux CD and Gatekeeper

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, gatekeeper, opa, resource limits, kubernetes, gitops, policy

Description: A practical guide to enforcing CPU and memory resource limits in Kubernetes using OPA Gatekeeper managed through Flux CD.

---

## Introduction

Resource limits are essential for Kubernetes cluster stability. Without proper limits, a single runaway container can consume all available resources, affecting other workloads. OPA Gatekeeper provides a policy-based approach to enforce resource constraints, and when combined with Flux CD, these policies become part of your GitOps workflow.

This guide covers deploying Gatekeeper with Flux CD, creating constraint templates for resource enforcement, and implementing graduated policies for different environments.

## Prerequisites

- A Kubernetes cluster (v1.25+)
- Flux CD bootstrapped and connected to a Git repository
- kubectl access to the cluster
- Basic understanding of OPA/Rego policy language

## Repository Structure

```yaml
# clusters/
#   my-cluster/
#     gatekeeper/
#       namespace.yaml
#       helm-repository.yaml
#       helm-release.yaml
#     resource-policies/
#       templates/
#         require-limits.yaml
#         limit-ranges.yaml
#         ratio-limits.yaml
#       constraints/
#         require-limits-prod.yaml
#         require-limits-staging.yaml
#         max-limits.yaml
```

## Deploying Gatekeeper with Flux CD

### Helm Repository and Release

```yaml
# clusters/my-cluster/gatekeeper/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gatekeeper
  namespace: gatekeeper-system
spec:
  interval: 1h
  url: https://open-policy-agent.github.io/gatekeeper/charts
```

```yaml
# clusters/my-cluster/gatekeeper/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gatekeeper-system
  labels:
    app.kubernetes.io/managed-by: flux
    admission.gatekeeper.sh/ignore: "true"
```

```yaml
# clusters/my-cluster/gatekeeper/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: gatekeeper
  namespace: gatekeeper-system
spec:
  interval: 30m
  chart:
    spec:
      chart: gatekeeper
      version: ">=3.14.0 <4.0.0"
      sourceRef:
        kind: HelmRepository
        name: gatekeeper
        namespace: gatekeeper-system
      interval: 12h
  values:
    # High availability configuration
    replicas: 3
    # Audit configuration
    audit:
      replicas: 2
      # Check existing resources every 5 minutes
      auditInterval: 300
      # Report violations for existing resources
      constraintViolationsLimit: 100
    # Exempt system namespaces from enforcement
    exemptNamespaces:
      - kube-system
      - gatekeeper-system
      - flux-system
    # Resource configuration for Gatekeeper itself
    resources:
      limits:
        cpu: "1"
        memory: 512Mi
      requests:
        cpu: 200m
        memory: 256Mi
```

## Constraint Template: Require Resource Limits

This template enforces that all containers have CPU and memory limits defined.

```yaml
# clusters/my-cluster/resource-policies/templates/require-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequireresourcelimits
  annotations:
    description: >-
      Requires containers to have CPU and memory resource limits specified.
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResourceLimits
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Which resource types to require
            requireCPU:
              type: boolean
              description: "Whether to require CPU limits"
            requireMemory:
              type: boolean
              description: "Whether to require memory limits"
            requireRequests:
              type: boolean
              description: "Whether to also require resource requests"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresourcelimits

        # Check each container in the pod
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Check if CPU limits are required and missing
          input.parameters.requireCPU
          not container.resources.limits.cpu
          msg := sprintf(
            "Container '%v' must have CPU limits defined",
            [container.name]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Check if memory limits are required and missing
          input.parameters.requireMemory
          not container.resources.limits.memory
          msg := sprintf(
            "Container '%v' must have memory limits defined",
            [container.name]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Check if CPU requests are required and missing
          input.parameters.requireRequests
          not container.resources.requests.cpu
          msg := sprintf(
            "Container '%v' must have CPU requests defined",
            [container.name]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Check if memory requests are required and missing
          input.parameters.requireRequests
          not container.resources.requests.memory
          msg := sprintf(
            "Container '%v' must have memory requests defined",
            [container.name]
          )
        }
```

## Constraint Template: Maximum Resource Limits

Prevent containers from requesting excessive resources.

```yaml
# clusters/my-cluster/resource-policies/templates/max-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8smaxresourcelimits
  annotations:
    description: >-
      Enforces maximum CPU and memory limits on containers.
spec:
  crd:
    spec:
      names:
        kind: K8sMaxResourceLimits
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxCPU:
              type: string
              description: "Maximum CPU limit (e.g., '4')"
            maxMemory:
              type: string
              description: "Maximum memory limit (e.g., '8Gi')"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8smaxresourcelimits

        # Convert CPU string to millicores for comparison
        cpu_to_millicores(cpu) = result {
          endswith(cpu, "m")
          result := to_number(trim_suffix(cpu, "m"))
        }

        cpu_to_millicores(cpu) = result {
          not endswith(cpu, "m")
          result := to_number(cpu) * 1000
        }

        # Convert memory string to bytes for comparison
        mem_to_bytes(mem) = result {
          endswith(mem, "Gi")
          result := to_number(trim_suffix(mem, "Gi")) * 1073741824
        }

        mem_to_bytes(mem) = result {
          endswith(mem, "Mi")
          result := to_number(trim_suffix(mem, "Mi")) * 1048576
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Compare container CPU limit against maximum
          cpu_limit := container.resources.limits.cpu
          max_cpu := input.parameters.maxCPU
          cpu_to_millicores(cpu_limit) > cpu_to_millicores(max_cpu)
          msg := sprintf(
            "Container '%v' CPU limit '%v' exceeds maximum '%v'",
            [container.name, cpu_limit, max_cpu]
          )
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          # Compare container memory limit against maximum
          mem_limit := container.resources.limits.memory
          max_mem := input.parameters.maxMemory
          mem_to_bytes(mem_limit) > mem_to_bytes(max_mem)
          msg := sprintf(
            "Container '%v' memory limit '%v' exceeds maximum '%v'",
            [container.name, mem_limit, max_mem]
          )
        }
```

## Constraint Template: Request-to-Limit Ratio

Ensure that resource requests are proportional to limits for better scheduling.

```yaml
# clusters/my-cluster/resource-policies/templates/ratio-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sresourceratio
  annotations:
    description: >-
      Enforces that resource requests are at least a given percentage
      of resource limits, preventing overcommitment.
spec:
  crd:
    spec:
      names:
        kind: K8sResourceRatio
      validation:
        openAPIV3Schema:
          type: object
          properties:
            minRatioPercent:
              type: integer
              description: "Minimum ratio of requests to limits as a percentage"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sresourceratio

        cpu_to_millicores(cpu) = result {
          endswith(cpu, "m")
          result := to_number(trim_suffix(cpu, "m"))
        }

        cpu_to_millicores(cpu) = result {
          not endswith(cpu, "m")
          result := to_number(cpu) * 1000
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          cpu_request := cpu_to_millicores(container.resources.requests.cpu)
          cpu_limit := cpu_to_millicores(container.resources.limits.cpu)
          # Calculate the ratio percentage
          ratio := (cpu_request / cpu_limit) * 100
          ratio < input.parameters.minRatioPercent
          msg := sprintf(
            "Container '%v': CPU request/limit ratio is %v%%, minimum is %v%%",
            [container.name, round(ratio), input.parameters.minRatioPercent]
          )
        }
```

## Applying Constraints per Environment

### Production Constraints (Strict)

```yaml
# clusters/my-cluster/resource-policies/constraints/require-limits-prod.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResourceLimits
metadata:
  name: require-resource-limits-production
spec:
  # Enforce immediately - reject non-compliant resources
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - production
      - production-*
  parameters:
    requireCPU: true
    requireMemory: true
    requireRequests: true
```

### Staging Constraints (Warn)

```yaml
# clusters/my-cluster/resource-policies/constraints/require-limits-staging.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResourceLimits
metadata:
  name: require-resource-limits-staging
spec:
  # Warn but do not block in staging
  enforcementAction: warn
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - staging
      - staging-*
  parameters:
    requireCPU: true
    requireMemory: true
    requireRequests: false
```

### Maximum Resource Constraints

```yaml
# clusters/my-cluster/resource-policies/constraints/max-limits.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sMaxResourceLimits
metadata:
  name: max-resource-limits
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
  parameters:
    # No single container should request more than 4 CPUs
    maxCPU: "4"
    # No single container should request more than 8Gi memory
    maxMemory: "8Gi"
```

## Flux Kustomization for Policy Deployment

```yaml
# clusters/my-cluster/resource-policies/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: resource-policies
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    # Gatekeeper must be running before applying policies
    - name: gatekeeper
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/resource-policies
  prune: true
  wait: true
  timeout: 5m
```

## Verifying Policy Enforcement

```bash
# Check Gatekeeper status
kubectl get pods -n gatekeeper-system

# List constraint templates
kubectl get constrainttemplates

# List active constraints
kubectl get constraints

# Check for violations on existing resources
kubectl get k8srequireresourcelimits -o yaml

# Test: Try to create a pod without resource limits in production
kubectl run test-no-limits --image=nginx -n production
# Expected: Error - denied by require-resource-limits-production

# Test: Create a pod with proper limits
kubectl run test-with-limits --image=nginx -n production \
  --requests='cpu=100m,memory=128Mi' \
  --limits='cpu=500m,memory=256Mi'
# Expected: Pod created successfully

# View audit results
kubectl describe k8srequireresourcelimits require-resource-limits-production
```

## Conclusion

Enforcing resource limits with Gatekeeper and Flux CD ensures cluster stability while maintaining a GitOps workflow. Constraint templates defined in Rego provide flexible policy logic, while Flux CD handles automatic deployment and reconciliation. By applying different enforcement levels per environment, you can gradually roll out policies without disrupting development workflows. This approach prevents resource exhaustion, improves scheduling efficiency, and establishes consistent resource governance across your Kubernetes infrastructure.
