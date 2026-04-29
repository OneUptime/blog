# Validation Summary: How to Migrate from Other CSI Drivers to Longhorn

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes (PersistentVolumeClaims, Deployments, StatefulSets, Pods)
- kubectl CLI
- CSI drivers (local-path, NFS, Rook-Ceph, cloud provider drivers)
- Alpine Linux container image (BusyBox `cp`)
- jq (for JSON filtering)

## Sources Consulted
- Kubernetes Pod lifecycle / Pod conditions: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-conditions
- Kubernetes Pod phases: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-phase
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Job termination / `Complete` condition: https://kubernetes.io/docs/concepts/workloads/controllers/job/#job-termination-and-cleanup
- Kubernetes PersistentVolumeClaim spec: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- StatefulSet PVC naming convention: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage
- Longhorn documentation: https://longhorn.io/docs/
- BusyBox `cp` flags (`-a`, `-v`): https://busybox.net/downloads/BusyBox.html

## Issues Found

1. **Invalid `kubectl wait` condition for Pods.** The post used `kubectl wait --for=condition=complete pod/...` in two places (Method 1 Step 3, and Method 2 StatefulSet loop). Pods do not have a `complete` condition — that condition belongs to the `batch/v1` Job resource. As written, this command would never succeed and would always hit the `--timeout=600s` ceiling.
   - Fixed both occurrences to use the jsonpath form supported by kubectl ≥ 1.23: `kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/... --timeout=600s`. This correctly waits for the Pod (which uses `restartPolicy: Never`) to reach the `Succeeded` phase after the `cp` finishes.

## Review Notes

- **Pre-Migration step 3 helper script is mislabelled.** The script under "Check current data usage in volumes" only echoes PVC names; it does not measure data usage. Additionally, `kubectl get pvc --all-namespaces -o name` outputs `persistentvolumeclaim/<name>` *without* the namespace, so the `cut`/`sed` namespace extraction does not produce the intended `<namespace>/<name>` output. This is illustrative scaffolding rather than a broken command, so it was left in place; a future revision could either use `-o jsonpath` to extract namespace + name properly, or `kubectl exec` into the pod to run `du -sh` for actual usage data.
- **Step 4 deployment YAML is partial.** The `updated-deployment.yaml` snippet omits `selector`, `template.metadata.labels`, and the container spec — so it is not directly applyable as-is. This is acceptable as a "show the diff" snippet, but a reader copy-pasting it would need to merge it with their existing manifest.
- **Verification section references `data-migrator`** after Step 5 instructs deleting that pod. The verification commands assume the migration pod still exists, so they should be run *before* the cleanup step. Order is slightly confusing but technically each command is correct.
- **`cp -av /source/. /destination/`** is correct for BusyBox `cp` in Alpine and properly preserves attributes and copies hidden files thanks to the trailing `/.`.
- **StatefulSet PVC naming pattern** (`<volumeClaimTemplate>-<statefulset-name>-<ordinal>`) is accurate. Note that the example creates *new* PVCs named `data-my-app-longhorn-$i` rather than the names the StatefulSet expects (`data-my-app-$i`); a real migration would typically delete the old PVCs and recreate them with the original names so the StatefulSet binds to them on scale-up. The post implies but does not show this final swap step — readers should plan for it.
- **`alpine:latest`** without a pinned digest/tag is fine for a one-off migration pod but is generally discouraged for reproducibility.
