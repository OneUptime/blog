# Validation Summary: How to Configure Storage Capacity Tracking for Accurate CSI Scheduling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes storage scheduling
- Container Storage Interface (CSI)
- CSIStorageCapacity
- CSIDriver
- StorageClass and PersistentVolumeClaim configuration
- kubectl
- CSI external-provisioner

## Sources Consulted
- Kubernetes Storage Capacity documentation: https://kubernetes.io/docs/concepts/storage/storage-capacity/
- Kubernetes CSIStorageCapacity API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes feature gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes CSI Developer Documentation for storage capacity tracking: https://kubernetes-csi.github.io/docs/storage-capacity-tracking.html
- Kubernetes CSI external-provisioner documentation: https://github.com/kubernetes-csi/external-provisioner/blob/master/README.md
- AWS EBS CSI driver Helm chart values and CSIDriver template: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/charts/aws-ebs-csi-driver
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The API verification command checked `/api/v1`, which is the core API group and does not list `storage.k8s.io` resources. Changed it to query `/apis/storage.k8s.io/v1`.
- The post described capacity as per-node in places. Updated wording to topology segments, which matches CSIStorageCapacity semantics.
- The CSI driver check used AWS EBS as the example and said to look for `storageCapacity: true` without making the `spec` field clear. Changed the example to a generic CSI driver and clarified `spec.storageCapacity: true`.
- The AWS EBS Helm example used `storageCapacity.enabled=true`, which is not present in the current official AWS EBS CSI Helm chart. Replaced that section with the generic, documented CSI pattern: enable `CSIDriver.spec.storageCapacity` and add `--enable-capacity` to the CSI external-provisioner.
- EBS-specific StorageClass examples implied AWS EBS capacity tracking support through those snippets. Replaced them with generic CSI driver examples so the configuration is not tied to an unsupported chart value.
- The expected event text `"Selected node with available storage capacity"` was not a documented Kubernetes scheduler event. Replaced it with a more accurate note about possible `FailedScheduling` events when no topology segment has enough capacity.
- The low-capacity `jq` command stripped all non-digits, which misread values such as `1Ti` or `1.5Ti`. Changed it to compare only simple `Gi` values instead of silently producing incorrect numbers.
- The monitoring script summed Kubernetes quantity strings with `awk`, which only works accidentally for some units and fails for mixed units. Limited the example to summing `Gi` values explicitly.
- The local-storage section implied manual CSIStorageCapacity management as a normal production approach. Clarified that manual objects are suitable for custom providers or lab validation, while production objects should normally be managed by the CSI driver deployment.
- The CronJob example used interactive `kubectl debug -it` inside a CronJob and tried to derive a Kubernetes quantity from `df -h`, which is not reliable automation. Replaced it with a node annotation based example that reads a pre-published allocatable capacity value.
- The troubleshooting `kubectl debug` command used an interactive form and direct `df` invocation that did not account for the node filesystem being mounted at `/host`. Updated it to inspect `/host` directly.

## Review Notes
The post is now technically accurate as a generic CSI capacity tracking guide. Real deployments still need driver-specific instructions, RBAC for any capacity updater, and confirmation that the chosen CSI driver implements `GetCapacity`.
