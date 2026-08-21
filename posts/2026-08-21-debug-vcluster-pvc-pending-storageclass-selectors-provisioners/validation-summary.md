# Validation Summary: Why Is a vCluster PVC Pending? StorageClass and Provisioner Debugging

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- vCluster 0.36 on shared nodes
- Kubernetes 1.36
- PersistentVolumeClaims and PersistentVolumes
- StorageClasses and dynamic provisioning
- Container Storage Interface (CSI) drivers and external provisioners
- Kubernetes scheduling, volume topology, and `WaitForFirstConsumer`
- `kubectl`, JSONPath, label selectors, and event/log inspection
- AWS EBS CSI driver

## Sources Consulted
- [vCluster 0.36: Sync StorageClasses from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/storage-classes)
- [vCluster 0.36: PersistentVolumeClaim sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/storage/persistent-volume-claims)
- [vCluster 0.36: PersistentVolume sync](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/storage/persistent-volumes)
- [vCluster 0.36: Sync-to-host defaults and management labels](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host)
- [vCluster 0.36: Shared-node storage hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening#storage-breakout-prevention)
- [vCluster 0.36 source: automatic sync-feature resolution](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/config/validation.go#L63-L76)
- [vCluster 0.36 source: PVC StorageClass selector enforcement](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/persistentvolumeclaims/syncer.go#L325-L375)
- [vCluster 0.36 source: translated-object labels](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/util/translate/labels.go#L43-L64)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Dynamic Volume Provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)
- [Kubernetes 1.36 PersistentVolume API](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/)
- [Kubernetes: Completing the cloud-provider and in-tree storage migration](https://kubernetes.io/blog/2024/05/20/completing-cloud-provider-migration/)
- [AWS EBS CSI driver design](https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/design.md)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found
1. **The vCluster selector was described as rejecting the PVC.** vCluster accepts the tenant PVC, leaves it unsynchronized, and records a `SyncWarning`; it does not reject the tenant API object. Changed the wording to say that the syncer declines or prevents synchronization.
2. **The `auto` StorageClass-sync explanation omitted activation conditions.** In vCluster 0.36, `sync.fromHost.storageClasses.enabled` literally defaults to `auto`; with PVC sync enabled and tenant-to-host StorageClass sync disabled, virtual or hybrid tenant-side scheduling activates it. Updated the version-specific explanation.
3. **A tenant-side “StorageClass not found” event was treated as conclusive.** With host-to-tenant StorageClass sync disabled or without a selector, vCluster can pass through a class name that exists only on the control plane cluster. Qualified the diagnostic so readers inspect the host claim in that case.
4. **StorageClass ownership and selector exceptions were too broad.** Only host-to-tenant (`sync.fromHost.storageClasses`) sync deletes tenant-created StorageClasses; tenant-to-host StorageClass sync has different behavior. The selector bypass also covers both an omitted and an explicitly empty `storageClassName`. Scoped the ownership statement and documented both bypass cases.
5. **Two shell placeholders were parsed as redirections.** Unquoted `<translated-pvc-name>` and `<vcluster-pod>` are not safe Bash or Zsh placeholders. Replaced them with `TRANSLATED_PVC_NAME` and `VCLUSTER_POD_NAME`, added replacement comments, selected the vCluster 0.36 `syncer` container explicitly, and made the final host watch target the translated claim.
6. **The no-host-claim and host-event explanations omitted or misattributed failure sources.** Control plane admission can prevent creation of the host claim. PVC binding/provisioning events normally come from the persistent-volume controller and external provisioner, while scheduling, attach, and mount failures normally appear on the consuming Pod. Corrected both explanations.
7. **The provisioner statement excluded valid static classes, and the Kubernetes 1.36 EBS claim was incorrect.** A healthy provisioner controller is required for dynamic provisioning, not for a class such as `kubernetes.io/no-provisioner`. Kubernetes removed the in-tree AWS EBS driver implementation in 1.27, but Kubernetes 1.36 still retains the deprecated `awsElasticBlockStore` API and redirects its operations to `ebs.csi.aws.com`. Qualified the controller requirement and corrected the EBS migration wording.
8. **Two Pending-PVC causes mixed provisioning with later lifecycle stages.** Missing attach permission normally fails the consuming Pod after the PVC is `Bound`, and an `allowedTopologies`/eligible-node mismatch specifically explains a Pending PVC with `WaitForFirstConsumer`. Updated both bullets to identify the correct stage.
9. **Static-binding and `Bound` semantics were imprecise.** PV node affinity constrains eligible nodes rather than directly matching a PVC, and `Bound` only establishes that Kubernetes associated the claim with a PV. Reworded the static-PV checks and the end-to-end verification accordingly.

## Review Notes
- The vCluster YAML field paths, booleans, and `matchLabels` selector are valid for vCluster 0.36. PVC sync defaults to enabled, PV sync defaults to disabled, and dynamic provisioning does not require tenant-to-host PV sync.
- The `vcluster.loft.sh/managed-by` existence selector is valid but can list claims from multiple vClusters; the post now describes the results as candidates rather than implying that the query uniquely identifies one claim.
- All remaining `kubectl` resource names, namespace flags, label selectors, JSONPath expressions, custom-column expressions, log flags, and watch flags are current and syntactically valid. The dotted label-key escape in `platform\.example\.com/vcluster-access` matches the documented JSONPath form.
- The claims about non-empty PVC selectors disabling dynamic provisioning, explicit empty `storageClassName` disabling dynamic provisioning, `WaitForFirstConsumer`, and the `spec.nodeName` scheduler bypass are correct.
- The author URL and all five documentation links in the post returned HTTP 200 during validation. The unversioned vCluster links currently resolve to the v0.36 Stable documentation; they may track a newer stable release in the future.
