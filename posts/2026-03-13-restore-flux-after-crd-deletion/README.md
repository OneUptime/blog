# How to Restore Flux State After Accidental CRD Deletion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, CRD Recovery, Custom Resources

Description: Recover from accidental CRD deletion in a Flux-managed cluster, restoring custom resources and dependent workloads without data loss.

---

## Introduction

CustomResourceDefinitions (CRDs) are the extension points that make Kubernetes so powerful. Flux CD itself depends on CRDs for every resource it manages — GitRepository, Kustomization, HelmRelease, and more. Accidentally deleting a CRD does not just remove the definition; it cascades to delete every custom resource of that type across all namespaces. This is a cluster-wide event that can break dozens of workloads simultaneously.

Recovery from CRD deletion requires understanding two separate problems: restoring the CRD schema itself, and restoring the custom resource instances that were deleted when the CRD disappeared. Flux can help with both, but the order of operations matters critically.

This guide covers recovery from CRD deletion for both Flux's own CRDs and third-party CRDs managed by Flux, with concrete steps for each scenario.

## Prerequisites

- `kubectl` and `flux` CLI access to the cluster
- Git repository with your Flux manifests and CRD definitions
- Flux CLI bootstrapped and connected to your repository
- Backup of any custom resources that are not stored in Git (if applicable)

## Step 1: Identify What Was Deleted

Determine which CRDs were deleted and what custom resources depended on them.

```bash
# Check which Flux CRDs are missing
kubectl get crd | grep -E "fluxcd|toolkit"

# Expected Flux CRDs:
# gitrepositories.source.toolkit.fluxcd.io
# kustomizations.kustomize.toolkit.fluxcd.io
# helmreleases.helm.toolkit.fluxcd.io
# helmrepositories.source.toolkit.fluxcd.io
# helmcharts.source.toolkit.fluxcd.io
# imagepolicies.image.toolkit.fluxcd.io
# imageupdateautomations.image.toolkit.fluxcd.io
# imagerepositories.image.toolkit.fluxcd.io

# Check for third-party CRDs that may be missing
kubectl get crd | grep -v "fluxcd\|toolkit\|kubernetes.io"
```

## Step 2: Restore Flux's Own CRDs

If Flux's own CRDs were deleted, the Flux controllers will stop working. The fastest recovery is re-applying the Flux install manifests.

```bash
# Option 1: Re-run flux bootstrap (safest, idempotent)
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path=clusters/production \
  --token-env=GITHUB_TOKEN

# Option 2: Apply CRDs directly from the Flux release
kubectl apply -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
```

After CRDs are restored, Flux's controllers will restart and begin reading custom resources again. Resources that were deleted along with the CRDs will be missing — Flux will recreate them from Git.

## Step 3: Restore Third-Party CRDs Managed by Flux

If a third-party CRD (e.g., cert-manager's `Certificate`, Prometheus's `ServiceMonitor`) was deleted, restore it through Flux by triggering reconciliation of the Kustomization that manages it.

```yaml
# Example: cert-manager CRDs managed in Git
# infrastructure/cert-manager/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/crds
  prune: false  # Never prune CRDs automatically
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apiextensions.k8s.io/v1
      kind: CustomResourceDefinition
      name: certificates.cert-manager.io
```

```bash
# Force reconciliation of the CRD Kustomization
flux reconcile kustomization cert-manager-crds --with-source
```

Note `prune: false` on CRD Kustomizations — this prevents Flux from ever automatically deleting CRDs, which would be catastrophic.

## Step 4: Restore Custom Resource Instances

After CRDs are restored, the custom resource instances (e.g., `Certificate`, `Ingress` objects) need to be re-applied. If they are tracked in Git, Flux reconciliation handles this automatically.

```bash
# Check which Kustomizations are failing due to missing CRs
flux get kustomizations -A

# Force reconciliation of dependent Kustomizations
flux reconcile kustomization apps --with-source

# Verify CRs are restored
kubectl get certificates -A
kubectl get prometheusrules -A
```

## Step 5: Handle CRs Not Stored in Git

If some custom resources were not committed to Git (a GitOps anti-pattern, but it happens), you need to restore them from a backup.

```bash
# If you have Velero backups
velero restore create --from-backup daily-backup-2026-03-13 \
  --include-resources certificates.cert-manager.io

# If you have etcd snapshots, restore to a temporary cluster and export
KUBECONFIG=/tmp/recovery-cluster.yaml \
  kubectl get certificates -A -o yaml > recovered-certs.yaml

# Apply to the production cluster
kubectl apply -f recovered-certs.yaml
```

## Step 6: Prevent Future CRD Deletion

```bash
# Add a finalizer to critical CRDs to prevent accidental deletion
kubectl patch crd certificates.cert-manager.io \
  -p '{"metadata":{"finalizers":["do-not-delete"]}}' \
  --type=merge

# Use OPA/Kyverno to block CRD deletion in production
```

```yaml
# Kyverno policy to prevent CRD deletion
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-crd-deletion
spec:
  rules:
    - name: deny-crd-delete
      match:
        resources:
          kinds: ["CustomResourceDefinition"]
      validate:
        message: "CRD deletion requires manual approval"
        deny:
          conditions:
            - key: "{{request.operation}}"
              operator: Equals
              value: DELETE
```

## Best Practices

- Set `prune: false` on all Kustomizations that manage CRDs — automatic CRD pruning is almost never desired.
- Store CRD manifests in Git so Flux can restore them automatically after deletion.
- Use Velero or etcd snapshots as a secondary backup for custom resources not in Git.
- Apply RBAC restrictions limiting who can delete CRDs in production clusters.
- Use admission webhooks (OPA or Kyverno) to block CRD deletion without explicit bypass.
- Separate CRD installation from controller installation in your Kustomization hierarchy.

## Conclusion

CRD deletion is a serious incident, but recovery is achievable with Flux CD when CRDs are stored in Git. The critical steps are restoring CRD schemas before attempting to restore custom resource instances, setting `prune: false` to prevent Flux from ever deleting CRDs, and using admission policies to prevent future accidents. A well-structured GitOps repository makes even this disruptive event recoverable within minutes.
