# Validation Summary: How to Configure CephFilesystemMirror Daemon in Rook

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (CephFS mirroring / cephfs-mirror daemon)
- Kubernetes (CRDs, kubectl, pod scheduling)
- CephFilesystemMirror CRD
- CephFilesystem CRD (mirroring configuration)

## Sources Consulted
- Rook CephFilesystemMirror CRD source: `pkg/apis/ceph.rook.io/v1/types.go` — `FilesystemMirroringSpec` struct definition (confirms available spec fields)
- Rook filesystem mirror controller source: `pkg/operator/ceph/file/mirror/spec.go` — confirms hardcoded single replica deployment
- Rook example YAML: `deploy/examples/filesystem-mirror.yaml`
- Ceph official documentation: https://docs.ceph.com/en/latest/cephfs/cephfs-mirroring/ — CLI command reference for `ceph fs snapshot mirror` subcommands

## Issues Found

### 1. Non-existent `spec.count` field (Critical)
**What was wrong:** The post used `spec.count` in the minimal CR (`count: 1`), full CR (`count: 2`), and a scaling section with a kubectl patch to change count to 3. The `CephFilesystemMirror` CRD does **not** have a `count` field. The Rook controller hardcodes replicas to 1. This field was likely confused with `CephRBDMirror`, which does have a `count` field.

**What was changed:**
- Removed `count: 1` from the minimal CR (changed to `spec: {}`)
- Removed `count: 2` and its comment from the full CR
- Removed the entire "Scaling Mirror Daemons" section (including the invalid kubectl patch command)
- Removed references to `count` from the summary paragraph

### 2. Non-existent Ceph CLI commands (Critical)
**What was wrong:** Two Ceph CLI commands do not exist:
- `ceph fs snapshot mirror status myfs` — there is no `status` subcommand for a specific filesystem
- `ceph fs snapshot mirror status myfs /` — there is no per-directory status command via the CLI

Per-filesystem and per-directory status are only available via the Ceph admin daemon socket, not through standard CLI commands.

**What was changed:** Replaced the two invalid commands with `ceph fs snapshot mirror ls myfs`, which lists mirrored directories for a filesystem and is a valid documented command.

### 3. Incorrect Ceph CLI command syntax (Moderate)
**What was wrong:** `ceph fs snapshot mirror peer list myfs` uses a space between "peer" and "list". The correct command uses an underscore: `peer_list`.

**What was changed:** Fixed to `ceph fs snapshot mirror peer_list myfs`.

## Review Notes
- The CephFilesystem mirroring section (`spec.mirroring` with `enabled`, `peers.secretNames`, and `snapshotSchedules`) is correct per the Rook source types.
- The pod label `app=rook-ceph-fs-mirror` is correct per the Rook controller source code.
- The `placement`, `resources`, and `priorityClassName` fields in the full CR are all valid fields on the `FilesystemMirroringSpec` struct.
- The Kubernetes scheduling constructs (nodeAffinity, podAntiAffinity, tolerations) under `placement` use correct Kubernetes API syntax.
- The deletion workflow (disable mirroring first, then delete the mirror CR) is the recommended approach.
