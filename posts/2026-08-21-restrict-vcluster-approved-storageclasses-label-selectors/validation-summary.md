# Validation Summary: How to Restrict vCluster Tenants to Approved StorageClasses with Label Selectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vCluster 0.36 container control planes on shared nodes
- vCluster host-to-tenant StorageClass synchronization
- Kubernetes StorageClasses, PersistentVolumeClaims, and PersistentVolumes
- Kubernetes label selectors
- Kubernetes dynamic volume provisioning and CSI storage
- kubectl and the vCluster CLI
- Kubernetes RBAC, admission control, and ResourceQuota

## Sources Consulted
- vCluster 0.36 StorageClass synchronization and selectors: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/storage-classes
- vCluster 0.36 shared-node security hardening: https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening
- vCluster 0.36 ResourceQuota configuration: https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/resource-quota
- vCluster 0.36 `vcluster create` CLI reference: https://www.vcluster.com/docs/vcluster/cli/vcluster_create
- vCluster 0.36 `vcluster connect` CLI reference: https://www.vcluster.com/docs/vcluster/cli/vcluster_connect
- vCluster configuration update workflow: https://www.vcluster.com/docs/vcluster/configure/what-is-vcluster-yaml
- vCluster v0.36.0 chart values and JSON schema: https://github.com/loft-sh/vcluster/tree/v0.36.0/chart
- vCluster v0.36.0 PersistentVolume syncer registration and class-selector implementation: https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/persistentvolumes/register.go and https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/persistentvolumes/syncer.go
- vCluster v0.36.0 PersistentVolumeClaim class-selector and legacy-annotation translation implementations: https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/persistentvolumeclaims/syncer.go and https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/controllers/resources/persistentvolumeclaims/translate.go
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes StorageClasses: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumes and dynamic provisioning: https://kubernetes.io/docs/concepts/storage/persistent-volumes/ and https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes v1.36 storage-class helper implementation: https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/apis/core/helper/helpers.go
- Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC and validating admission policy: https://kubernetes.io/docs/reference/access-authn-authz/rbac/ and https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- kubectl command references for `label`, `get`, `apply`, `describe`, and namespace creation: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The behavior list implied that tenant-created PersistentVolumes would synchronize under the shown configuration, even though `sync.toHost.persistentVolumes.enabled` is `false`. Updated the list to make PV selector enforcement and `SyncWarning` behavior conditional on enabling PV synchronization.
- The denial test described the same selector-mismatch event for both nonexistent and existing-but-unapproved StorageClasses. Updated the expected result because vCluster reports that a nonexistent class could not be reached, while an existing unapproved class does not match the selector.
- The ResourceQuota recommendation represented `requests.storage` as though it were a nested vCluster configuration path and did not state that ResourceQuota must be enabled. Corrected it to enable `policies.resourceQuota` and identify `requests.storage` and `count/persistentvolumeclaims` as literal keys in the `quota` map.
- The create command set `--connect=false`, but the next commands were to run in the tenant cluster. Removed that flag so the vCluster CLI's documented default connection switches to the tenant context before the tenant-side tests.
- The post overstated the native selector as a complete PVC/PV class allowlist. In vCluster 0.36 the gate skips omitted or empty `spec.storageClassName` values and does not inspect the deprecated `volume.beta.kubernetes.io/storage-class` annotation, even though vCluster and Kubernetes still recognize that annotation. Corrected the scope of the claim, distinguished omitted from explicitly empty PVC fields, and required admission to reject the legacy annotation and enforce an explicit approved class.

## Review Notes
The post is version-specific and was reviewed against the vCluster v0.36.0 chart/schema, tagged syncer source, and v0.36 stable documentation. The legacy-annotation behavior is source-specific and should be rechecked on upgrade. The label commands are correct for adding labels; deliberately changing an existing label value requires `--overwrite`.
