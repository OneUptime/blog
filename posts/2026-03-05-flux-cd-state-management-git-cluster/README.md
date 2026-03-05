# How Flux CD Manages State Between Git and Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, State Management, Drift Detection, Reconciliation

Description: Learn how Flux CD tracks and reconciles the desired state in Git with the actual state in your Kubernetes cluster through its inventory and reconciliation mechanisms.

---

A core principle of GitOps is that Git serves as the single source of truth for your infrastructure. Flux CD implements this principle by continuously comparing the desired state stored in Git with the live state in your Kubernetes cluster and reconciling any differences. Understanding how Flux manages this state is essential for debugging reconciliation issues, understanding resource ownership, and working effectively with the GitOps workflow.

This guide explains the internal mechanisms Flux uses to track state, manage inventory, detect drift, and ensure convergence between Git and cluster.

## The Reconciliation Model

Flux CD follows a pull-based reconciliation model. Rather than pushing changes to the cluster when a commit happens, Flux controllers periodically pull the desired state from sources (Git repositories, Helm repositories, OCI registries) and compare it with what exists in the cluster.

The reconciliation loop for a Kustomization resource follows these steps:

1. The source-controller fetches the latest artifact from the configured source
2. The kustomize-controller detects a new artifact revision
3. The controller runs `kustomize build` on the artifact to produce the desired manifests
4. The controller compares the desired manifests with the live cluster state
5. Resources that differ are created, updated, or deleted
6. The controller records the result in the Kustomization status

```bash
# View the current reconciliation status
flux get kustomization my-app

# See the last applied revision
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.lastAppliedRevision}'
```

## Inventory Tracking

Flux tracks which resources belong to each Kustomization through an inventory stored in the resource's status field. This inventory is a list of every Kubernetes resource that the Kustomization manages:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq .
```

The output shows each managed resource with its group, kind, namespace, name, and version:

```json
[
  {
    "id": "_default_Deployment_apps_my-app",
    "v": "v1"
  },
  {
    "id": "_default_Service__my-app",
    "v": "v1"
  },
  {
    "id": "_default_ConfigMap__my-app-config",
    "v": "v1"
  }
]
```

The inventory serves several purposes:

- **Pruning**: When a resource is removed from Git, Flux checks the inventory to find resources that should no longer exist and deletes them
- **Ownership**: The inventory establishes which Kustomization owns which resources, preventing conflicts between multiple Kustomizations
- **Drift detection**: Flux uses the inventory to know which resources to check for drift during each reconciliation

## Source Artifact Management

The source-controller manages artifacts -- packaged versions of your desired state fetched from Git, Helm, or OCI sources. Each artifact has a revision that corresponds to the source version:

```bash
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.artifact}'
```

```json
{
  "revision": "main@sha1:abc123def456",
  "path": "gitrepository/flux-system/flux-system/abc123.tar.gz",
  "lastUpdateTime": "2026-03-05T10:30:00Z"
}
```

Artifacts are stored temporarily on the source-controller's local storage. When the kustomize-controller or helm-controller needs to reconcile, it fetches the artifact from the source-controller's HTTP server. This decouples source fetching from resource application, allowing each phase to operate independently and retry on its own schedule.

## Drift Detection and Correction

Flux detects drift by comparing the desired state (from the latest artifact) with the actual state in the cluster. During each reconciliation cycle, the kustomize-controller performs a server-side apply dry run to determine if any resources need updating.

When drift is detected, Flux corrects it by re-applying the desired state:

```bash
# Force an immediate reconciliation to check for and correct drift
flux reconcile kustomization my-app
```

The controller uses server-side apply, which means it only manages the fields that are specified in the manifests. Fields added by other controllers (like annotations added by service meshes) are preserved unless they conflict with fields Flux manages.

## The Role of Field Managers

Kubernetes server-side apply tracks which manager owns which fields in a resource. Flux's kustomize-controller uses a field manager name based on the Kustomization resource. This means:

- Fields set by Flux are owned by Flux and will be corrected if modified externally
- Fields set by other controllers (HPA, admission webhooks) are owned by those controllers and left untouched
- Conflicts occur only when two managers try to set the same field to different values

View field ownership for a resource:

```bash
kubectl get deployment my-app -o json | jq '.metadata.managedFields[] | {manager, fieldsV1}'
```

## Garbage Collection and Pruning

When you remove a manifest from Git, Flux needs to know that the corresponding resource should be deleted from the cluster. This is where the inventory and the `spec.prune` setting work together:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
```

With `prune: true`, during each reconciliation Flux compares the current set of resources produced by `kustomize build` with the inventory. Resources that are in the inventory but not in the build output are deleted. After deletion, the inventory is updated to reflect the new state.

Without pruning enabled, removed manifests leave orphaned resources in the cluster that must be manually cleaned up.

## Status and Conditions

Flux stores reconciliation results in the status field of each resource. The most important condition is `Ready`:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: ReconciliationSucceeded
      message: "Applied revision: main@sha1:abc123"
      lastTransitionTime: "2026-03-05T10:30:00Z"
  lastAppliedRevision: "main@sha1:abc123"
  lastAttemptedRevision: "main@sha1:abc123"
```

When `lastAppliedRevision` matches `lastAttemptedRevision` and the `Ready` condition is `True`, the cluster state matches the Git state for that revision. When they differ or `Ready` is `False`, something went wrong during reconciliation.

## Handling Conflicts Between Kustomizations

If two Kustomizations try to manage the same resource, Flux detects the conflict through field ownership. The second Kustomization to apply will see a conflict error:

```
Apply failed: conflict with "kustomize-controller" using apps/v1
```

Resolve conflicts by ensuring each resource is managed by exactly one Kustomization. Use the `flux tree kustomization` command to visualize which resources belong to which Kustomization:

```bash
flux tree kustomization my-app --compact
```

## Summary

Flux CD manages state between Git and cluster through a combination of artifact tracking, inventory management, server-side apply, and continuous reconciliation. The source-controller packages the desired state from Git into versioned artifacts. The kustomize-controller maintains an inventory of managed resources, applies the desired state using server-side apply to handle field ownership correctly, and prunes resources that are no longer defined in Git. Understanding these mechanisms helps you debug reconciliation issues, prevent resource conflicts, and work confidently within the GitOps workflow.
