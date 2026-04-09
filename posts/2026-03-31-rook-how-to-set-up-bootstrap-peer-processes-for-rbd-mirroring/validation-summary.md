# Validation Summary: How to Set Up Bootstrap Peer Processes for RBD Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD mirroring, rbd-mirror daemon)
- Rook (CephRBDMirror CRD, CephBlockPool CRD)
- Kubernetes (Secrets, kubectl)
- cephadm (orchestrator deployment)

## Sources Consulted
- Ceph official RBD mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph GitHub PR #30411 (bootstrap peer feature introduction, merged to master Sept 2019)
- Ceph GitHub PR #30821 (backport to Nautilus, merged Nov 2019)
- Rook RBD mirroring guide: https://rook.io/docs/rook/v1.17/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook CephRBDMirror CRD documentation: https://rook.io/docs/rook/v1.14/CRDs/Block-Storage/ceph-rbd-mirror-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph source code (MirrorPool.cc) for valid `rbd mirror pool` subcommands

## Issues Found

1. **Prerequisites listed wrong minimum Ceph version**: The post stated "Ceph Luminous or later" but the bootstrap peer commands (`rbd mirror pool peer bootstrap create/import`) were introduced in Ceph Nautilus (14.2.x), not Luminous (12.2.x). Fixed to "Ceph Nautilus (14.2.x) or later."

2. **Non-existent command `rbd mirror pool peer list`**: The command `rbd mirror pool peer list rbd` does not exist. The registered subcommands under `rbd mirror pool peer` are `add`, `remove`, `set`, `bootstrap create`, and `bootstrap import`. The correct command to view peer information is `rbd mirror pool info <pool>`. Fixed the command and updated the expected output format to match `rbd mirror pool info` output.

3. **Missing required mode argument for `rbd mirror image enable`**: Since Ceph Octopus (15.2.x), the `rbd mirror image enable` command requires a mode argument (`snapshot` or `journal`). The post omitted this, which would cause the command to fail on Octopus and later releases. Fixed by adding `snapshot` as the recommended mode with a comment showing `journal` as an alternative.

4. **Double base64 encoding of bootstrap token in Rook section**: The `rbd mirror pool peer bootstrap create` command already outputs a base64-encoded token. The post piped this through `| base64 | tr -d '\n'`, which would double-encode the token and cause Rook to fail when decoding it. Removed the extra encoding step.

5. **`peers.secretNames` placed on wrong CRD**: The post placed `spec.peers.secretNames` on the CephRBDMirror resource, but this field belongs on the CephBlockPool CRD under `spec.mirroring.peers.secretNames`. The CephRBDMirror CRD only controls daemon deployment (count, placement, resources). Fixed by splitting into two separate YAML manifests: one for CephRBDMirror (daemon) and one for CephBlockPool (peer configuration).

## Review Notes
- The example output for `rbd mirror image status` uses `master_position` terminology, which was changed to `primary_position` in newer Ceph releases as part of inclusive naming changes. This is not technically wrong for older versions but may not match what users see on recent clusters.
- The architecture diagram is simplified and doesn't show that rbd-mirror daemons only need to run on the secondary (receiving) cluster for unidirectional mirroring. For bidirectional (rx-tx), both sites need active daemons. The post's guidance to deploy on both clusters is safe but could be clarified.
