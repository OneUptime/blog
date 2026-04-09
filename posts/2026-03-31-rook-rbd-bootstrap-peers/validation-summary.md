# Validation Summary: How to Set Up Bootstrap Peers and Peer Tokens for RBD Mirroring in Rook

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system)
- RBD (RADOS Block Device) mirroring
- Kubernetes (Secrets, CRDs)
- CephBlockPool CRD

## Sources Consulted
- [Rook RBD Mirroring Documentation (latest)](https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/)
- [Rook CephBlockPool CRD Reference (v1.17)](https://www.rook.io/docs/rook/v1.17/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Rook CephBlockPool CRD Reference (v1.12)](https://rook.io/docs/rook/v1.12/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Rook CRDs YAML source (master)](https://raw.githubusercontent.com/rook/rook/master/deploy/examples/crds.yaml)
- [Ceph RBD Mirroring Documentation (reef)](https://docs.ceph.com/en/reef/rbd/rbd-mirroring/)
- [ceph/ceph rbd-mirroring.rst (GitHub)](https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst)

## Issues Found

### Issue 1: Invalid `mode` values in CephBlockPool YAML (Critical)
**What was wrong:** All three CephBlockPool YAML examples used `mode: journal`, with `# mode: snapshot` commented out as an alternative. These are not valid values for the Rook CephBlockPool CRD. The CRD defines exactly three valid enum values for `spec.mirroring.mode`: `pool`, `image`, and `init-only`. Using `mode: journal` or `mode: snapshot` causes CRD validation to fail — the resource would not be accepted by the Kubernetes API server.

The confusion arises because Ceph itself has two replication mechanisms at the RBD level (journal-based and snapshot-based), but in Rook's CRD, `mode` refers to the *mirroring scope*: `pool` (all images) or `image` (only explicitly enabled images). The mechanism (journal vs snapshot) is determined by whether `snapshotSchedules` is configured: omitting it uses journal-based replication; including it configures snapshot-based replication.

**What was changed:** All three instances of `mode: journal` were replaced with `mode: image`. The comment was updated from "journal mode mirrors at the journal level" to "image mode mirrors individual images (use 'pool' to mirror all images in the pool)".

### Issue 2: `ceph mirror daemon status` is not a valid Ceph command (Moderate)
**What was wrong:** The Troubleshooting section contained `ceph mirror daemon status`, which is not a real Ceph CLI command. No such subcommand exists in the Ceph CLI. Executing it would produce an error.

**What was changed:** Replaced with `rbd mirror pool status replicapool --verbose`, which is the correct command. It already appeared in Step 6 of the same post and correctly shows daemon health, image health, and replication state in its output.

## Review Notes
- The `mirroring.peers.secretNames` field path in the CephBlockPool spec is correct and confirmed by the Rook CRD definition.
- The `rbd mirror pool peer bootstrap create --site-name <name> <pool>` command syntax is correct per Ceph documentation.
- The description of bootstrap token output as "a base64-encoded JSON token" is accurate.
- The Rook v1.10+ prerequisite is slightly conservative — the `peers.secretNames` field exists in v1.9 — but it is not incorrect, and v1.10 aligns well with the Ceph Quincy requirement also stated in the prerequisites.
- Note that Rook currently supports only a single peer secret per pool (the `secretNames` array accepts one entry). The post does not claim otherwise, but future readers should be aware of this limitation.
- The `snapshotSchedules` field in Step 1 is technically valid alongside `mode: image` (it enables snapshot-based mirroring); the updated comment clarifies that omitting it uses journal-based mirroring instead, which better conveys the distinction to readers.
