# Validation Summary: How to Set Up Backup and Restore with Velero for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero (Kubernetes backup tool)
- Rook-Ceph (distributed storage orchestrator)
- Kubernetes CSI Volume Snapshots
- Rook Object Storage (S3-compatible via ObjectBucketClaim)
- AWS S3 plugin for Velero

## Sources Consulted
- Velero official documentation: https://velero.io/docs/
- Velero CLI reference for `velero install`, `velero backup`, `velero restore`, `velero schedule`
- Rook-Ceph documentation on ObjectBucketClaim: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook-Ceph documentation on CSI snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshotClass API reference: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Go pflag library boolean flag behavior (relevant to Velero CLI flags)

## Issues Found
1. **`--backup-location-config` line continuation formatting (Step 3):** The original command split the `--backup-location-config` value across multiple lines using shell line continuations (`\`) with leading indentation. This introduces whitespace that causes shell word splitting, breaking the single comma-separated config string into multiple separate arguments (`region=us-east-1,`, `s3ForcePathStyle=true,`, `s3Url=http://...`). Only the first fragment would be parsed as the config value, causing the install to fail or misconfigure. Fixed by placing the entire config value on a single line.

2. **`--use-volume-snapshots true` boolean flag syntax (Step 3):** Go's pflag library (used by Velero's cobra CLI) does not consume the next positional argument for boolean flags. `--use-volume-snapshots true` would set the flag to true implicitly but leave `true` as an unrecognized positional argument. Fixed to `--use-volume-snapshots=true` using the explicit equals-sign syntax.

## Review Notes
- The velero-plugin-for-csi (v0.7.0) and the `--features=EnableCSI` flag are technically redundant for Velero 1.12+, where CSI snapshot support was integrated into core Velero. However, including them is not incorrect and maintains backward compatibility with older Velero versions. A future update could note the Velero version requirements.
- The ObjectBucketClaim assumes a StorageClass named `rook-ceph-bucket` already exists, which requires a CephObjectStore and corresponding StorageClass to be configured beforehand. The post could benefit from a prerequisites section, but this is a style consideration, not a technical error.
- All other commands (`velero backup create`, `velero restore create`, `velero schedule create`, `velero backup describe`), YAML configurations (ObjectBucketClaim, VolumeSnapshotClass), and credential retrieval commands are technically correct.
