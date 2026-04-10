# How to Clean Up Rook-Ceph CRDs After Uninstallation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Kubernetes, CRD, Cleanup, Uninstall

Description: Learn how to properly clean up Rook-Ceph Custom Resource Definitions after uninstalling Rook to prevent orphaned CRDs from interfering with reinstallation.

---

After uninstalling Rook-Ceph, Custom Resource Definitions (CRDs) are often left behind. Helm's default behavior is to not delete CRDs on `helm uninstall` because they may contain important data. Leftover CRDs can cause issues when reinstalling Rook or interfere with other Ceph-related tools. This guide covers complete CRD cleanup.

## Why CRDs Persist After Uninstall

Helm intentionally keeps CRDs after uninstall to prevent accidental data loss. The Helm team reasoned that CRD deletion also deletes all custom resources of that type, which is destructive. When you run `helm uninstall rook-ceph`, the CRDs remain.

Verify what CRDs are still present:

```bash
kubectl get crd | grep -E "rook|ceph"
```

```text
cephblockpoolradosnamespaces.ceph.rook.io    2024-01-01T00:00:00Z
cephblockpools.ceph.rook.io                  2024-01-01T00:00:00Z
cephbucketnotifications.ceph.rook.io         2024-01-01T00:00:00Z
cephbuckettopics.ceph.rook.io                2024-01-01T00:00:00Z
cephclients.ceph.rook.io                     2024-01-01T00:00:00Z
cephclusters.ceph.rook.io                    2024-01-01T00:00:00Z
cephfilesystemmirrors.ceph.rook.io           2024-01-01T00:00:00Z
cephfilesystems.ceph.rook.io                 2024-01-01T00:00:00Z
cephfilesystemsubvolumegroups.ceph.rook.io   2024-01-01T00:00:00Z
cephnfses.ceph.rook.io                       2024-01-01T00:00:00Z
cephobjectrealms.ceph.rook.io                2024-01-01T00:00:00Z
cephobjectstores.ceph.rook.io                2024-01-01T00:00:00Z
cephobjectstoreusers.ceph.rook.io            2024-01-01T00:00:00Z
cephobjectzonegroups.ceph.rook.io            2024-01-01T00:00:00Z
cephobjectzones.ceph.rook.io                 2024-01-01T00:00:00Z
cephrbdmirrors.ceph.rook.io                  2024-01-01T00:00:00Z
cephcosidrivers.ceph.rook.io                 2024-01-01T00:00:00Z
objectbucketclaims.objectbucket.io           2024-01-01T00:00:00Z
objectbuckets.objectbucket.io                2024-01-01T00:00:00Z
```

## Step 1: Verify No Custom Resources Exist

Before deleting CRDs, confirm all custom resources have been removed:

```bash
# Check for any remaining Rook CRs in all namespaces
for crd in $(kubectl get crd -o name | grep -E "rook|ceph"); do
  CRD_NAME=$(echo "$crd" | cut -d'/' -f2)
  COUNT=$(kubectl get "$CRD_NAME" -A --no-headers 2>/dev/null | wc -l)
  if [ "$COUNT" -gt 0 ]; then
    echo "WARNING: $CRD_NAME has $COUNT remaining resources"
    kubectl get "$CRD_NAME" -A 2>/dev/null
  fi
done
```

If any resources exist, delete them before removing the CRDs.

## Step 2: Delete Rook CRDs

Delete all Rook CRDs from the installed version's manifest:

```bash
ROOK_VERSION="v1.14.0"
kubectl delete -f \
  https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml \
  --ignore-not-found
```

Or delete them individually:

```bash
kubectl delete crd cephclusters.ceph.rook.io --ignore-not-found
kubectl delete crd cephblockpools.ceph.rook.io --ignore-not-found
kubectl delete crd cephfilesystems.ceph.rook.io --ignore-not-found
kubectl delete crd cephobjectstores.ceph.rook.io --ignore-not-found
kubectl delete crd cephobjectstoreusers.ceph.rook.io --ignore-not-found
kubectl delete crd cephnfses.ceph.rook.io --ignore-not-found
kubectl delete crd cephrbdmirrors.ceph.rook.io --ignore-not-found
kubectl delete crd cephfilesystemmirrors.ceph.rook.io --ignore-not-found
kubectl delete crd cephfilesystemsubvolumegroups.ceph.rook.io --ignore-not-found
kubectl delete crd cephblockpoolradosnamespaces.ceph.rook.io --ignore-not-found
kubectl delete crd cephbucketnotifications.ceph.rook.io --ignore-not-found
kubectl delete crd cephbuckettopics.ceph.rook.io --ignore-not-found
kubectl delete crd cephclients.ceph.rook.io --ignore-not-found
kubectl delete crd cephobjectrealms.ceph.rook.io --ignore-not-found
kubectl delete crd cephobjectzonegroups.ceph.rook.io --ignore-not-found
kubectl delete crd cephobjectzones.ceph.rook.io --ignore-not-found
kubectl delete crd cephcosidrivers.ceph.rook.io --ignore-not-found
kubectl delete crd objectbucketclaims.objectbucket.io --ignore-not-found
kubectl delete crd objectbuckets.objectbucket.io --ignore-not-found
```

## Step 3: Handle Stuck CRD Deletion

Sometimes CRD deletion gets stuck because there are custom resources that were not deleted first. CRDs have their own finalizer (`customresourcecleanup.apiextensions.k8s.io`).

Check for stuck CRD deletion:

```bash
kubectl get crd | grep rook | grep Terminating
```

If a CRD is stuck, find and delete the remaining custom resources:

```bash
# For a stuck CRD like cephclusters.ceph.rook.io
kubectl get cephclusters -A
kubectl -n rook-ceph delete cephcluster rook-ceph --force --grace-period=0
```

Or remove the CRD finalizer directly:

```bash
kubectl patch crd cephclusters.ceph.rook.io \
  -p '{"metadata":{"finalizers":[]}}' \
  --type=merge
```

## Step 4: Delete Related Cluster-Scoped Resources

After CRDs, clean up other cluster-scoped Rook resources:

```bash
kubectl delete clusterrole -l operator=rook,storage-backend=ceph --ignore-not-found
kubectl delete clusterrolebinding -l operator=rook,storage-backend=ceph --ignore-not-found
kubectl delete clusterrole rook-ceph-system rook-ceph-cluster-mgmt --ignore-not-found
kubectl delete clusterrolebinding rook-ceph-system --ignore-not-found
```

## Step 5: Verify Complete CRD Cleanup

Confirm all Rook CRDs are removed:

```bash
kubectl get crd | grep -E "rook|ceph"
```

This should return no results. If any CRDs remain, repeat the deletion steps.

## Summary

Cleaning up Rook-Ceph CRDs after uninstallation requires first verifying all custom resources are deleted (since CRD deletion cascades to resources), then deleting the CRDs using the manifest from the installed Rook version, handling any stuck CRDs by removing their finalizers or deleting remaining resources, and finally cleaning up related cluster-scoped RBAC resources. Helm does not delete CRDs on uninstall by design, so manual CRD cleanup is always required after a Rook uninstallation.
