# Validation Summary: How to Create Longhorn Volumes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (PersistentVolumeClaim, Deployment, StatefulSet, StorageClass)
- Longhorn custom resources (`volumes.longhorn.io` v1beta2)
- kubectl CLI
- nginx and PostgreSQL container images (used in examples)

## Sources Consulted
- Longhorn Volume CRD definition (authoritative schema): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/crds.yaml
- Longhorn official docs - Create Volumes (1.11.1): https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/create-volumes/
- Longhorn discussion #3429 - Applying Volume CRD with kubectl: https://github.com/longhorn/longhorn/discussions/3429
- Longhorn official docs - ReadWriteMany (RWX) Volumes (1.9.1): https://longhorn.io/docs/1.9.1/nodes-and-volumes/volumes/rwx-volumes/
- SUSE Storage 1.10 - RWX Volumes: https://documentation.suse.com/cloudnative/storage/1.10/en/volumes/rwx-volumes.html
- Kubernetes PersistentVolume access modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes

## Issues Found

1. **Invalid `fsType` field on the Longhorn Volume CRD.** The Method 3 example included `fsType: ext4` directly under `spec`, but the `volumes.longhorn.io` v1beta2 CRD schema does not define an `fsType` property — `fsType` is a StorageClass parameter (used during dynamic provisioning), not a field on the Volume custom resource. Submitting a Volume manifest with this field would fail OpenAPI schema validation. Removed `fsType: ext4` from the manifest.

2. **Missing `frontend` field in the Volume CRD example.** The `frontend` field controls how the block device is exposed to the host (`blockdev`, `iscsi`, `nvmf`, `ublk`). The original example omitted it; while the empty string is technically allowed by the schema, in practice `blockdev` is what real-world examples use and what Longhorn's own discussions recommend. Added `frontend: blockdev` with a comment listing the valid values, and added inline comments listing valid `dataLocality` and `accessMode` values for completeness.

3. **Misleading prerequisite for ReadWriteMany volumes.** The post said RWX "requires NFS provisioner component", which is inaccurate — Longhorn implements RWX natively via a share-manager pod that runs an NFSv4 server, and there is no separate NFS provisioner component to install. The actual prerequisite is that each Kubernetes node must have an NFSv4 client installed (e.g., `nfs-common` on Debian/Ubuntu, `nfs-utils` on RHEL/SUSE). Rewrote the sentence to describe the real requirement.

## Review Notes

- All `accessMode` values used (`rwo`, lowercase) match the CRD enum, which accepts only `rwo`, `rwop`, and `rwx`.
- All `dataLocality` values used (`disabled`) match the CRD enum, which accepts `disabled`, `best-effort`, and `strict-local`.
- The PVC, Deployment, and StatefulSet manifests are valid Kubernetes objects and conform to current `apps/v1` and `v1` schemas.
- `kubectl get volumes.longhorn.io` and `kubectl describe volume.longhorn.io` are both valid kubectl invocations (singular/plural are interchangeable).
- The Longhorn UI's "Create Volume" form fields described in Method 2 match what is shown in current Longhorn UI screenshots in the official docs.
- The post does not pin a Longhorn version. The current example will work against Longhorn 1.5+ (when `longhorn.io/v1beta2` became the served version). Readers on older Longhorn releases (v1.2.x or earlier) might still see `longhorn.io/v1beta1`; consider adding a version note in a future revision.
- The PostgreSQL StatefulSet example sets `POSTGRES_PASSWORD` inline as plaintext — fine for a tutorial, but a future revision could mention using a Secret for production use. Not changed since it is outside the scope of "technical correctness."
