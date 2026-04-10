# Validation Summary: How to Schedule Reclaim Space CronJobs with Rook CSI-Addons

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph (distributed storage)
- CSI-Addons (kubernetes-csi-addons project)
- ReclaimSpaceCronJob / ReclaimSpaceJob custom resources
- Kubernetes (kubectl, CronJob concepts, PVCs)

## Sources Consulted
- ReclaimSpaceCronJob Go type definitions: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/api/csiaddons/v1alpha1/reclaimspacecronjob_types.go
- ReclaimSpaceJob Go type definitions: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/api/csiaddons/v1alpha1/reclaimspacejob_types.go
- CSI-Addons ReclaimSpace documentation: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/docs/reclaimspace.md
- CSI-Addons v1alpha1 API package: https://pkg.go.dev/github.com/csi-addons/kubernetes-csi-addons/api/csiaddons/v1alpha1
- Rook Ceph CSI Drivers docs: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/

## Issues Found

### Issue 1: Wrong field name `jobSpec` — should be `jobTemplate` with nested `spec`
- **What was wrong:** Both YAML examples used `spec.jobSpec.target.persistentVolumeClaim` as a flat structure. The actual CRD uses `spec.jobTemplate.spec.target.persistentVolumeClaim` — the Go struct field has the JSON tag `"jobTemplate"`, and the job spec fields are nested under an additional `spec:` key within `jobTemplate`.
- **What was changed:** Replaced `jobSpec:` with `jobTemplate:` and added the required `spec:` nesting level in both YAML examples.
- **Why:** Using `jobSpec` would cause a Kubernetes validation error when applying the manifest. The CRD expects `jobTemplate` per the CSI-Addons v1alpha1 API definition.

### Issue 2: `retryDeadlineSeconds: 3600` exceeds maximum allowed value
- **What was wrong:** The first YAML example set `retryDeadlineSeconds: 3600`. The CRD has a kubebuilder validation maximum of 1800 seconds.
- **What was changed:** Changed `retryDeadlineSeconds` from `3600` to `1800` in the first YAML example.
- **Why:** A value of 3600 would be rejected by the CRD validation. The maximum allowed value is 1800 seconds (30 minutes).

## Review Notes
- The `apiVersion: csiaddons.openshift.io/v1alpha1` is correct — there is no v1beta1 or v1 version of this API as of the latest release (v0.14.0).
- All kubectl resource names (reclaimspacecronjob, reclaimspacejob) are correct.
- The cron schedule syntax, concurrencyPolicy values, suspend/resume patch commands, and shell loop for multiple PVCs are all technically correct.
- The post does not mention `spec.startingDeadlineSeconds`, an optional field that sets a deadline for starting missed jobs — this could be a useful addition in a future update but is not an error.
