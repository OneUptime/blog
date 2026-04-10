# Validation Summary: How to Set Up Cross-Cluster Backup with Ceph Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device) mirroring
- Kubernetes (kubectl CLI, CRDs, Secrets)
- CephBlockPool CRD
- CephRBDMirror CRD

## Sources Consulted
- Rook official documentation on RBD mirroring: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephRBDMirror CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-rbd-mirror-crd/
- Ceph official documentation on RBD mirroring: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/

## Issues Found

1. **Incorrect CRD name in overview**: The overview stated mirroring is configured using "CephBlockPoolRadosNamespace and CephRBDMirror resources." `CephBlockPoolRadosNamespace` is not the standard resource for RBD mirroring — it is `CephBlockPool`. The post's own YAML examples and summary section correctly used `CephBlockPool`, contradicting the overview text. Fixed to reference `CephBlockPool`.

2. **Contradictory RPO claim**: The overview claimed "RPO in the minutes range" while the example snapshot schedule used `interval: 24h`. A 24-hour snapshot interval yields an RPO of up to 24 hours, not minutes. The summary section more accurately stated "RPO is bounded by your snapshot schedule interval." Fixed the overview to match this accurate phrasing instead of making a specific minutes-range claim.

## Review Notes
- The bootstrap token secret creation uses `--from-file=token=` while official Rook docs show `--from-literal=token=<decoded-value>`. Both approaches can work, but users should be aware the token from `rbd mirror pool peer bootstrap create` is base64-encoded, and the Rook operator expects the decoded value in the secret. The `--from-file` approach used in the post will work if the file contains only the token string.
- All RBD mirror CLI commands (`rbd mirror pool info`, `rbd mirror image enable`, `rbd mirror image status`, `rbd mirror pool status`, `rbd mirror image promote`) have correct syntax and flags.
- The CephBlockPool and CephRBDMirror YAML specs are correct and match the official Rook CRD documentation.
- The `spec.mirroring.peers.secretNames` field path for importing the bootstrap token on the secondary cluster is correct.
