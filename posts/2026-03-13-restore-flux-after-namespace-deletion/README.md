# How to Restore Flux State After Accidental Namespace Deletion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Namespace Recovery, DevOps

Description: Recover from accidental namespace deletion in a Flux-managed cluster by understanding Flux reconciliation mechanics and restoring state from Git.

---

## Introduction

Accidental namespace deletion is one of the most common operator mistakes in Kubernetes. A single `kubectl delete namespace production` can take down dozens of Deployments, Services, ConfigMaps, and PersistentVolumeClaims in seconds. Without GitOps, recovery means hunting through backup systems and hoping your documentation is current.

With Flux CD, the situation is dramatically different. Your desired state lives in Git, and Flux's reconciliation loop is designed to converge the cluster toward that state. However, recovery is not always automatic — especially if the deleted namespace contained Flux resources themselves or if `prune: true` complicates the picture.

This guide covers the mechanics of namespace-level recovery, explains when Flux will self-heal and when you need to intervene, and gives you concrete commands to restore operations quickly.

## Prerequisites

- A Flux CD-managed cluster with GitRepository and Kustomization resources
- `kubectl` and `flux` CLI access to the affected cluster
- Access to the Git repository backing the cluster
- Understanding of which Kustomizations target the deleted namespace

## Step 1: Assess the Blast Radius

Before acting, understand exactly what was deleted and which Flux resources are affected.

```bash
# Confirm the namespace is gone
kubectl get namespace production

# List all Flux Kustomizations that targeted the deleted namespace
kubectl get kustomization -A -o json | \
  jq '.items[] | select(.spec.targetNamespace == "production") | .metadata.name'

# Check Flux source health
flux get sources all -A

# Check overall Kustomization status
flux get kustomizations -A
```

Look for Kustomizations showing `False` ready status with errors referencing the missing namespace.

## Step 2: Recreate the Namespace

Flux's `prune: true` setting means Flux will delete resources it no longer sees in Git — but it does not delete namespaces it does not own. Recreate the namespace manually first.

```bash
kubectl create namespace production

# If the namespace had specific labels/annotations (check your Git repo)
kubectl label namespace production \
  environment=production \
  istio-injection=enabled
```

If the namespace definition is tracked in Git as a manifest, Flux will reconcile it automatically once the Kustomization is healthy — but creating it manually unblocks the reconciliation immediately.

## Step 3: Force Flux Reconciliation

After the namespace exists, trigger an immediate reconciliation so Flux does not wait for its next scheduled interval.

```bash
# Reconcile the source first
flux reconcile source git flux-system

# Then reconcile each Kustomization that targets the namespace
flux reconcile kustomization infrastructure --with-source
flux reconcile kustomization apps --with-source

# Watch progress
flux get kustomizations -A --watch
```

Flux will re-apply all manifests defined in Git for the namespace, restoring Deployments, Services, ConfigMaps, and other resources.

## Step 4: Restore Secrets

Secrets in Kubernetes are not version-controlled in plaintext. After namespace recreation, secrets managed by Sealed Secrets or External Secrets Operator need to re-materialize.

```bash
# If using Sealed Secrets, check that SealedSecret objects are re-applied
kubectl get sealedsecrets -n production

# Force the controller to reconcile
kubectl annotate sealedsecret my-app-secret -n production \
  sealedsecrets.bitnami.com/managed=true --overwrite

# If using External Secrets Operator
kubectl get externalsecrets -n production
flux reconcile kustomization secrets --with-source
```

## Step 5: Recover PersistentVolumeClaims

PVCs are the trickiest resource to recover. If the underlying PersistentVolume had a `Retain` reclaim policy, the data survives namespace deletion.

```bash
# Find PVs that were previously bound to the deleted namespace
kubectl get pv | grep Released

# Patch the PV to remove the old claim reference, making it available
kubectl patch pv pvc-abc123 -p \
  '{"spec":{"claimRef":{"name":null,"namespace":null,"uid":null}}}'
```

Then ensure your Git manifests include the correct `volumeName` in the PVC spec so Flux binds to the correct PV on re-apply.

```yaml
# In your Git repo - PVC with explicit volumeName for recovery
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: production
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 10Gi
  volumeName: pvc-abc123  # Pin to the existing PV
  storageClassName: standard
```

## Step 6: Validate Recovery

```bash
# All pods in the namespace should be Running
kubectl get pods -n production

# Check that all Flux resources are ready
flux get all -n flux-system

# Verify application endpoints
kubectl get svc -n production
curl -f https://my-app.example.com/health
```

## Best Practices

- Add namespace manifests to your Git repository so they are version-controlled and Flux-managed.
- Use RBAC to restrict who can delete namespaces — require a separate approval step for production namespaces.
- Configure PersistentVolumes with `reclaimPolicy: Retain` to protect data from accidental deletion.
- Set up alerts on namespace deletion events using an audit log webhook.
- Test namespace recovery quarterly as part of your disaster recovery drills.
- Use `dependsOn` in Kustomizations to ensure namespaces are created before workloads that depend on them.

## Conclusion

Accidental namespace deletion is painful, but with Flux CD and a well-structured Git repository, recovery is a matter of minutes rather than hours. The key steps are recreating the namespace, triggering Flux reconciliation, restoring secrets, and recovering any retained PersistentVolumes. Flux's reconciliation loop does the heavy lifting of re-applying every resource defined in your Git repository.
