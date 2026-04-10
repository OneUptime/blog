# Validation Summary: How to Configure Two-Way RBD Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (snapshot-based)
- Kubernetes (kubectl)
- CephRBDMirror CRD
- CephBlockPool CRD

## Sources Consulted
- Ceph RBD Mirroring documentation (https://docs.ceph.com/en/reef/rbd/rbd-mirroring/)
- Ceph rbd-mirroring.rst source on GitHub (https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst)
- Ceph MirrorPool.cc source (https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/MirrorPool.cc) - confirms `bootstrap import` reads token from a file path, not raw string
- Rook CephRBDMirror CRD documentation (https://rook.io/docs/rook/v1.14/CRDs/Block-Storage/ceph-rbd-mirror-crd/)
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph rbd man page (https://docs.ceph.com/en/latest/man/8/rbd/)

## Issues Found

### 1. `rbd mirror pool peer bootstrap import` passed raw token string instead of file path
**What was wrong:** Steps 2-3 passed the raw token content as a CLI argument (`"${SITE_B_TOKEN}"`). The `bootstrap import` command expects a file path as its last positional argument, or `-` to read from stdin. Passing a raw base64 string would cause the tool to attempt opening it as a filename, which would fail.
**What was changed:** Fixed to pipe the token via stdin using `cat /tmp/bootstrap-token.txt | kubectl exec -i ... rbd mirror pool peer bootstrap import ... replicapool -`.

### 2. Unnecessary double token exchange for bidirectional peering
**What was wrong:** The post generated bootstrap tokens from both sites and cross-imported them. The official Ceph documentation shows that a single `bootstrap create` on one site followed by `bootstrap import` on the other site with the default `--direction rx-tx` establishes full bidirectional peering. Double cross-importing could create duplicate peer entries.
**What was changed:** Simplified Steps 2-3 to generate a single token on site-a and import it on site-b with `--direction rx-tx`.

### 3. `peers.secretNames` placed on wrong CRD
**What was wrong:** The `peers.secretNames` field was shown inside the CephRBDMirror resource. This field does not exist on CephRBDMirror; it belongs on the CephBlockPool CRD under `spec.mirroring.peers.secretNames`.
**What was changed:** Separated into two YAML resources: a CephBlockPool with `mirroring.enabled`, `mirroring.mode`, and `mirroring.peers.secretNames`; and a CephRBDMirror with only `count: 1`.

### 4. Missing `kubectl exec` in Step 7
**What was wrong:** The `rbd mirror image status` command in Step 7 was run bare (`rbd mirror image status ...`) without the `kubectl exec` wrapper, inconsistent with all other commands in the post.
**What was changed:** Added the `kubectl exec -it deploy/rook-ceph-tools -n rook-ceph --` prefix.

## Review Notes
- The `rbd mirror pool enable replicapool pool` command syntax is correct. Valid modes are `pool`, `image`, or `init-only`.
- The `rbd mirror image enable replicapool/myimage snapshot` syntax is correct. Snapshot-based mirroring was introduced in Ceph Pacific.
- The `rbd mirror pool status replicapool --verbose` flag is valid per official docs.
- When using Rook's CephBlockPool CRD with `mirroring.enabled: true`, the manual `rbd mirror pool enable` CLI command in Step 1 may be redundant since Rook handles pool mirroring configuration through the CRD. However, both approaches work and the CLI commands serve as educational examples.
- The `-i` flag (not `-it`) is used for the import command since the token is piped via stdin; `-t` would interfere with piping.
