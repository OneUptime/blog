# VPA and Flux CD Resource Requests Conflict

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Kubernetes, GitOps, Resource Management

Description: Learn how to resolve the conflict between VPA (Vertical Pod Autoscaler) automatically modifying pod resource requests and Flux CD continuously reconciling them back to the Git-declared state.

---

## Introduction

One possible pain point when running VPA alongside Flux CD is a field ownership conflict: VPA applies resource recommendations to Pods, while Flux CD continuously reconciles the workload manifests declared in Git. In the common Deployment or StatefulSet case, VPA mutates Pods at admission time and Flux manages the controller object, so Flux does not normally overwrite those Pod-level changes. A conflict appears when the same resource fields are managed by both systems, for example when Flux manages Pod manifests directly or another automation patches workload templates outside Git.

When it does occur, the conflict can manifest as pods being evicted by VPA to apply new resource requests while Flux or another GitOps reconciliation path restores the Git-declared values on the managed object. Understanding the ownership boundary is essential for any team using both Flux CD and VPA.

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

## Step 2: Solution 1 - Let VPA Own Resource Requests

The safest way to avoid field ownership conflicts is to stop declaring the VPA-managed request fields in Git. Flux uses server-side apply, and the `Merge` apply policy preserves fields added by other tools when those fields do not overlap with the desired state declared in the manifest.

```yaml
# deployment-with-vpa-requests-omitted.yaml - Deployment without VPA-managed requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  annotations:
    # Preserve fields added by other controllers when they are not declared here
    kustomize.toolkit.fluxcd.io/ssa: "Merge"
spec:
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
      - name: api
        image: my-api:v1.0
        # Requests are intentionally omitted so VPA can set them on Pods.
```

## Step 3: Solution 2 - Remove Request Fields Before Flux Applies

If your base Deployment manifest includes request fields, remove those fields in the Kustomize overlay that Flux builds. The patch belongs in the `kustomization.yaml` in your source path, not in the Flux `Kustomization` custom resource.

```yaml
# kustomization.yaml - remove VPA-managed requests from the applied manifest
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
patches:
- target:
    kind: Deployment
    name: api-service
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

## Step 5: Solution 4 - Use VPA in Off Mode for Recommendations

If you want Git to remain the only source of truth for resource requests, use VPA in `Off` mode. VPA will write recommendations to status, but it will not apply them to Pods automatically.

```yaml
# vpa-off-mode.yaml - VPA recommendation-only mode
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
    # Off mode: generate recommendations only; do not mutate Pods
    updateMode: "Off"
```

## Best Practices

- Use VPA in `Initial` mode with a process to periodically commit recommendations to Git
- Avoid using deprecated VPA `Auto` mode; use `Recreate` for eviction-based updates, `InPlaceOrRecreate` when your cluster supports in-place Pod resizing, or `Initial`/`Off` for GitOps-driven changes
- Consider using VPA in `Off` mode purely for visibility, and make resource updates manually through GitOps
- Document your chosen conflict resolution strategy in your team's runbooks
- Test any conflict resolution approach in a non-production environment before applying broadly

## Conclusion

The VPA-Flux conflict is a tension between declarative GitOps and dynamic autoscaling when both systems manage the same resource fields. The cleanest resolution depends on your priorities: if GitOps purity matters most, use VPA in `Initial` or `Off` mode and commit recommendations to Git. If automation is paramount, omit VPA-managed request fields from the manifests Flux applies. Either approach requires intentional configuration when ownership overlaps.
