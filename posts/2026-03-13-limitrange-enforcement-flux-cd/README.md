# LimitRange Enforcement with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, LimitRange, Flux-cd, GitOps, Resource-Management, Multi-Tenancy

Description: Learn how to enforce CPU and memory limits across Kubernetes namespaces using LimitRange resources managed through Flux CD's GitOps workflow.

---

## Introduction

Kubernetes LimitRange resources set default and maximum CPU/memory constraints for containers, pods, and PersistentVolumeClaims within a namespace. Without LimitRanges, a single misconfigured pod can consume all available cluster resources and starve other workloads.

Managing LimitRanges through Flux CD ensures consistent resource governance across all namespaces. When a new namespace is created or an existing one is updated, Flux automatically applies the correct LimitRange without manual intervention-eliminating the risk of namespaces being created without resource constraints.

This guide covers defining LimitRange resources, organizing them in Git with Kustomize overlays, and reconciling them with Flux CD so enforcement is automatic and auditable.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed
- A Git repository structure with Kustomize overlays per environment

## Step 1: Define a Base LimitRange

Create a base LimitRange that sets sensible defaults for container resource requests and limits. This base will be shared across environments.

```yaml
# base/limitrange.yaml - Default LimitRange applied to application namespaces
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    # Default container limits prevent unbounded resource consumption
    - type: Container
      default:
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "64Mi"
      max:
        cpu: "2"
        memory: "2Gi"
      min:
        cpu: "50m"
        memory: "32Mi"
    # Pod-level limits cap the aggregate resource usage of all containers in a pod
    - type: Pod
      max:
        cpu: "4"
        memory: "4Gi"
```

## Step 2: Create Environment-Specific Overlays

Use Kustomize overlays to customize LimitRange values per environment. Production workloads typically need higher limits than development.

```yaml
# overlays/production/limitrange-patch.yaml - Increases limits for production workloads
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: "512Mi"
      defaultRequest:
        cpu: "200m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "50m"
        memory: "32Mi"
```

```yaml
# overlays/production/kustomization.yaml - Kustomize overlay for production environment
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: limitrange-patch.yaml
    target:
      kind: LimitRange
      name: default-limits
```

## Step 3: Apply LimitRanges to Multiple Namespaces

Use a Kustomize namespace transformer or separate Kustomization resources to apply the same LimitRange across multiple namespaces.

```yaml
# clusters/production/limitranges.yaml - Flux Kustomization applying limits to the app namespace
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: limitranges-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Override the namespace to apply the LimitRange to each target namespace
  targetNamespace: app-production
  patches:
    - patch: |
        - op: replace
          path: /metadata/name
          value: default-limits
      target:
        kind: LimitRange
```

## Step 4: Verify LimitRange Enforcement

After Flux reconciles the configuration, verify that the LimitRanges are applied and that new pods inherit the default limits.

```bash
# Describe the LimitRange in the target namespace
kubectl describe limitrange default-limits -n app-production

# Create a pod without explicit resource requests to confirm defaults are applied
kubectl run test-pod --image=nginx --namespace=app-production

# Check that default limits were injected into the pod spec
kubectl get pod test-pod -n app-production -o jsonpath='{.spec.containers[0].resources}'
```

## Best Practices

- Always define both `defaultRequest` and `default` to ensure the scheduler can make placement decisions
- Set `min` values to prevent pods with zero resource requests from bypassing scheduling heuristics
- Keep base LimitRanges conservative and relax them in overlays for namespaces with known high-resource workloads
- Combine LimitRanges with ResourceQuotas for comprehensive namespace-level governance
- Use `prune: true` in Flux Kustomizations to remove stale LimitRanges when namespaces are decommissioned
- Review and update LimitRanges periodically as application resource profiles change

## Conclusion

Enforcing LimitRanges through Flux CD brings consistency and automation to Kubernetes resource governance. By storing LimitRange definitions in Git and reconciling them with Flux, your team can confidently ensure that every namespace has appropriate resource constraints-preventing noisy-neighbor problems and making capacity planning more predictable.
