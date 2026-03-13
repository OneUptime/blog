# How to Configure Force Apply for Immutable Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kustomization, Force Apply, Immutable Resources, Server-Side Apply

Description: Learn how to configure Flux to force apply immutable Kubernetes resources that would otherwise fail during reconciliation.

---

## Introduction

Certain Kubernetes resources contain immutable fields that cannot be changed after creation. Common examples include the `clusterIP` field on Services, the `selector` field on Deployments, and ConfigMaps or Secrets used with `immutable: true`. When Flux attempts to reconcile changes to these resources, it encounters errors because Kubernetes rejects modifications to immutable fields.

The typical error message is "field is immutable" or something similar. Without intervention, Flux will keep retrying the reconciliation and failing, leaving the resource in a stuck state.

Flux provides a force apply mechanism that handles immutable resources by deleting and recreating them when necessary. This guide walks through configuring force apply at the Kustomization level, along with the trade-offs involved.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- kubectl access to the cluster
- A GitRepository or OCIRepository source configured in Flux
- Basic understanding of Flux Kustomization resources

## Understanding the Immutable Resource Problem

When Flux uses server-side apply to reconcile resources, Kubernetes enforces immutability rules on certain fields. For example, if you change the label selector on a Deployment, Kubernetes rejects the change:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app-v2  # Changed from my-app - this will fail
  template:
    metadata:
      labels:
        app: my-app-v2
    spec:
      containers:
        - name: app
          image: nginx:1.25
```

Flux will report a reconciliation error because the selector field is immutable once the Deployment is created.

## Enabling Force Apply on a Kustomization

To enable force apply for all resources managed by a Kustomization, set `spec.force` to `true`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  force: true
```

When `force` is set to `true`, Flux will delete and recreate any resource that fails to apply due to immutable field changes. This applies to all resources within the Kustomization.

## Force Apply with Wait and Timeout

When force is enabled, Flux deletes a resource before recreating it. Using `wait` and `timeout` ensures Flux confirms the recreated resources become ready:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./clusters/production/infrastructure
  prune: true
  force: true
  wait: true
  timeout: 5m
```

## Isolating Force Apply to Specific Resources

Sometimes you do not want to force apply all resources in a Kustomization, only specific ones. In these cases, split your deployment into multiple Kustomizations:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-mutable
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app/base
  prune: true
  force: false
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-immutable
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app/immutable
  prune: true
  force: true
  dependsOn:
    - name: my-app-mutable
```

This approach limits the blast radius of force apply to only the resources that actually need it.

## Force Apply for Immutable ConfigMaps and Secrets

Kubernetes supports marking ConfigMaps and Secrets as immutable for performance reasons. When you need to update an immutable ConfigMap, force apply handles the recreation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
immutable: true
data:
  config.yaml: |
    database:
      host: db.example.com
      port: 5432
```

With `force: true` on the Kustomization, Flux will delete the existing immutable ConfigMap and create the new version. Note that any pods referencing this ConfigMap will need to be restarted to pick up the new values.

## Force Apply for Jobs

Kubernetes Jobs have immutable spec fields once created. If you manage Jobs through Flux and need to update their specifications, force apply is essential:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database-migrations
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/migrations
  prune: true
  force: true
  wait: true
  timeout: 10m
```

This ensures that updated Job definitions replace the old ones cleanly.

## Important Considerations

Force apply causes a brief period of downtime for the affected resources because the resource is deleted before being recreated. For stateless workloads behind a Service with multiple replicas, this is generally acceptable. For stateful workloads or single-replica Deployments, plan accordingly.

When force is enabled and pruning is also enabled, be aware that Flux will delete resources that are removed from the source. The combination of force and prune means Flux has full lifecycle control over the resources.

You should also monitor the Flux events after enabling force apply to verify that resources are being recreated as expected:

```bash
kubectl get events -n flux-system --field-selector reason=ReconciliationSucceeded
flux get kustomizations -A
```

## Troubleshooting

If resources are still failing after enabling force apply, check the Flux logs for the kustomize-controller:

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "my-app"
```

Common issues include finalizers preventing deletion, RBAC permissions preventing Flux from deleting the resource, and webhook validations blocking the recreation.

## Conclusion

Force apply in Flux provides a practical solution for managing Kubernetes resources with immutable fields. By setting `spec.force: true` on your Kustomization, Flux can handle the delete-and-recreate cycle automatically when immutable field changes are detected. For production environments, consider isolating resources that need force apply into separate Kustomizations to minimize disruption and maintain control over which resources can be forcefully replaced.
