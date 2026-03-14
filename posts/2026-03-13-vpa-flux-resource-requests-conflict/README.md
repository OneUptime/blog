# VPA and Flux CD Resource Requests Conflict

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Kubernetes, GitOps, Resource Management

Description: Learn how to resolve the conflict between VPA (Vertical Pod Autoscaler) automatically modifying pod resource requests and Flux CD continuously reconciling them back to the Git-declared state.

---

## Introduction

One of the most common pain points when running VPA alongside Flux CD is the reconciliation conflict: VPA modifies pod resource requests to right-size workloads, but Flux CD's reconciliation loop detects these changes as drift from the Git-declared state and overwrites them. This creates a cycle where VPA and Flux continuously fight over resource values.

This conflict manifests as pods being evicted by VPA to apply new resource requests, Flux immediately reconciling back to the original values, and VPA evicting again - causing repeated restarts and negating all the benefits of VPA. Understanding and resolving this conflict is essential for any team using both Flux CD and VPA.

This guide covers the conflict patterns and their solutions.

## Prerequisites

- Kubernetes cluster with VPA and Flux CD installed
- `flux` CLI installed
- `kubectl` with cluster admin access
- Git repository for Flux manifests

## Step 1: Identify the Conflict

Confirm that the VPA-Flux conflict is occurring in your cluster.

```bash
# Check if VPA is making recommendations that differ from deployed requests
kubectl describe vpa <vpa-name> -n <namespace>

# Look for repeated Deployment reconciliation events from Flux
flux get kustomizations -A

# Check if pods are being repeatedly evicted
kubectl get events -n <namespace> | grep -E "evict|VPA" | head -20

# See if resource requests keep changing back and forth
kubectl get pods -n <namespace> -l app=<app-name> \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].resources.requests}{"\n"}{end}'
```

## Step 2: Solution 1 - Use Flux Field Manager Ignore Annotations

Tell Flux to ignore specific fields that VPA manages.

```yaml
# deployment-with-vpa-ignore.yaml - Deployment with VPA field ignore annotation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  annotations:
    # Ignore resource requests/limits managed by VPA
    # This prevents Flux from overwriting VPA's changes
    kustomize.toolkit.fluxcd.io/force: "disabled"
spec:
  template:
    metadata:
      annotations:
        # VPA will manage these - Flux should not reset them
        kubectl.kubernetes.io/last-applied-configuration: ""
    spec:
      containers:
      - name: api
        image: my-api:v1.0
        resources:
          requests:
            # Initial values - VPA will update these without Flux interference
            cpu: "250m"
            memory: "256Mi"
```

## Step 3: Solution 2 - Use Flux Server-Side Apply with Field Ownership

Configure Flux to use server-side apply and respect VPA field ownership.

```yaml
# flux-kustomization-ssa.yaml - Kustomization with SSA enabled
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Use server-side apply to respect field ownership by VPA
  force: false
  # Configure resource manager to avoid VPA conflict
  patches:
  - target:
      kind: Deployment
    patch: |
      - op: remove
        path: /spec/template/spec/containers/0/resources/requests/cpu
      - op: remove
        path: /spec/template/spec/containers/0/resources/requests/memory
```

## Step 4: Solution 3 - Use VPA in Initial Mode with Flux

The cleanest solution is to use VPA in `Initial` mode and commit VPA's recommendations back to Git.

```yaml
# vpa-initial-mode.yaml - VPA in Initial mode (only sets on pod creation)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    # Initial mode: only sets resources on new pods, no evictions
    updateMode: "Initial"
```

```bash
# Get VPA recommendation and update Git manually
kubectl get vpa api-service-vpa -n production \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target}'

# Update the Deployment resource requests in Git with the recommended values
# Edit apps/production/api-service/deployment.yaml with recommended values
# Commit the change - Flux applies it, VPA confirms it's correct
git add apps/production/api-service/deployment.yaml
git commit -m "chore: update resource requests based on VPA recommendations"
git push
```

## Step 5: Solution 4 - Flux Ignore Specific Resource Fields via Kustomize

Use a Kustomize patch to remove resource requests from what Flux manages.

```yaml
# kustomization.yaml - remove resources from Flux management
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
patches:
- target:
    kind: Deployment
    name: api-service
  patch: |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: api-service
      annotations:
        # Flux will not manage fields marked with this annotation
        config.kubernetes.io/local-config: "true"
```

## Best Practices

- Use VPA in `Initial` mode with a process to periodically commit recommendations to Git
- Never run VPA in `Auto` mode without configuring Flux to ignore resource fields
- Consider using VPA in `Off` mode purely for visibility, and make resource updates manually through GitOps
- Document your chosen conflict resolution strategy in your team's runbooks
- Test any conflict resolution approach in a non-production environment before applying broadly

## Conclusion

The VPA-Flux conflict is a fundamental tension between declarative GitOps and dynamic autoscaling. The cleanest resolution depends on your priorities: if GitOps purity matters most, use VPA in `Initial` or `Off` mode and commit recommendations to Git. If automation is paramount, configure Flux to ignore resource fields. Either approach requires intentional configuration - the default behavior of running both without coordination will result in the conflict loop described here.
