# How to Enable Garbage Collection in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, GitOps, Kustomization, Garbage-Collection, Kubernetes, Pruning

Description: Learn how to enable garbage collection in Flux Kustomization to automatically remove resources that are no longer defined in your Git repository.

---

## Introduction

When managing Kubernetes resources with Flux CD and GitOps, one common challenge is ensuring that resources removed from your Git repository are also deleted from the cluster. Without garbage collection enabled, Flux will only apply new and updated resources but leave orphaned resources running indefinitely. This can lead to resource sprawl, security risks, and unexpected behavior in your cluster.

Flux's Kustomization controller provides a built-in garbage collection mechanism through the `prune` field. When enabled, Flux tracks all resources it applies and automatically deletes any that are no longer present in the source repository. This post walks you through enabling and configuring garbage collection in Flux Kustomization.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v2.x)
- `kubectl` configured to access your cluster
- A Git repository connected to Flux as a GitRepository source
- Basic familiarity with Kustomize and Flux Kustomization resources

## Understanding Garbage Collection in Flux

Flux garbage collection works by maintaining an inventory of all resources applied by a Kustomization. On each reconciliation cycle, Flux compares the current set of resources in the Git repository against the stored inventory. Any resources present in the inventory but missing from the repository are flagged for deletion.

This mechanism relies on labels that Flux automatically applies to every resource it manages. These labels link each resource back to the Kustomization that created it, allowing Flux to identify which resources belong to which Kustomization.

## Enabling Garbage Collection

To enable garbage collection, set the `prune` field to `true` in your Kustomization spec:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: default
```

With `prune: true`, Flux will automatically delete any resource from the cluster that is no longer present in the `./clusters/my-cluster/app` path of your Git repository.

## How the Inventory Works

When Flux applies resources, it stores an inventory snapshot in the Kustomization status. You can inspect this inventory using kubectl:

```bash
kubectl get kustomization my-app -n flux-system -o yaml
```

The status section will contain an inventory listing all managed resources:

```yaml
status:
  inventory:
    entries:
      - id: default_my-deployment_apps_Deployment
        v: v1
      - id: default_my-service_v1_Service
        v: v1
      - id: default_my-configmap_v1_ConfigMap
        v: v1
```

Each entry represents a resource that Flux manages. When a resource is removed from Git, it disappears from the computed inventory on the next reconciliation, and Flux deletes it from the cluster.

## Example Workflow

Consider a scenario where you have two manifests in your Git repository:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
```

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 80
```

If you delete `service.yaml` from your Git repository and push the change, Flux will detect that the Service resource is no longer in the source and will delete it from the cluster on the next reconciliation.

## Verifying Garbage Collection

After removing a resource from Git, you can verify that Flux has cleaned it up by checking the Kustomization events:

```bash
kubectl events -n flux-system --for kustomization/my-app
```

You should see events indicating the resource was garbage collected. You can also force an immediate reconciliation:

```bash
flux reconcile kustomization my-app
```

Then verify the resource was removed:

```bash
kubectl get service web-app -n default
```

## Important Considerations

Garbage collection only affects resources that Flux has applied and tracks in its inventory. Resources created manually with `kubectl apply` or by other controllers are not affected.

If you have `prune: false` (the default), Flux will never delete resources from the cluster, even if they are removed from Git. This is the safer default but requires manual cleanup of removed resources.

When you first enable `prune: true` on an existing Kustomization, Flux will not immediately delete anything. It will build the inventory from the current set of resources in Git and only prune on subsequent reconciliations when resources are actually removed.

Be careful when reorganizing your Git repository structure. Moving manifests to a different path without updating the Kustomization `path` field could cause Flux to see all resources as removed and delete them from the cluster.

## Combining with Other Options

You can combine garbage collection with other Kustomization settings for more control:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  timeout: 3m
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: default
```

The `timeout` field controls how long Flux waits for health checks before considering the reconciliation failed. The `retryInterval` determines how soon Flux retries after a failure.

## Conclusion

Enabling garbage collection in Flux Kustomization is a critical step for maintaining a clean and consistent GitOps workflow. By setting `prune: true`, you ensure that your cluster state always reflects what is defined in your Git repository. This eliminates orphaned resources, reduces security risks from abandoned workloads, and keeps your cluster tidy. Always test garbage collection behavior in a staging environment before enabling it in production, and consider using labels or annotations to protect resources that should not be pruned.
