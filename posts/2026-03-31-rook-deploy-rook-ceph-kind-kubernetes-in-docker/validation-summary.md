# Validation Summary: How to Deploy Rook-Ceph on Kind (Kubernetes in Docker)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.0)
- Kind (Kubernetes in Docker)
- Kubernetes
- Docker
- Helm
- Linux loop devices

## Sources Consulted
- Kind source code and API types (`kubernetes-sigs/kind` repository, `pkg/apis/config/v1alpha4/types.go`)
- Kind CLI command source (`pkg/cmd/kind/`)
- Rook Helm chart index (`https://charts.rook.io/release/index.yaml`) — confirmed chart name `rook-ceph`, latest v1.19.3
- Rook CephCluster CRD Go types and official examples (`rook/rook` repository)
- Rook OSD configuration documentation (storage config keys: `databaseSizeMB`, `walSizeMB`)
- Quay.io container registry — confirmed `quay.io/ceph/ceph:v18.2.0` image exists
- Rook toolbox deployment example (`deploy/examples/toolbox.yaml`)
- Rook PVC example (`deploy/examples/csi/rbd/pvc.yaml` on `master` branch)
- Linux kernel device documentation (`Documentation/admin-guide/devices.txt`, major 7 = loop devices)

## Issues Found

### 1. Invalid config key `journalSizeMB` (Step 5 YAML)
- **What was wrong:** The CephCluster storage config used `journalSizeMB: "1024"`. The `journalSizeMB` key is a legacy filestore concept. Modern Ceph uses bluestore exclusively, which has a Write-Ahead Log (WAL) instead of a journal.
- **What was changed:** Replaced `journalSizeMB` with `walSizeMB`.
- **Why:** The documented OSD config keys for bluestore are `databaseSizeMB` and `walSizeMB`. Using `journalSizeMB` would be silently ignored or cause an error.

### 2. Misleading "directories" text (Step 5)
- **What was wrong:** The text said "use the `useAllDevices: false` and a `directories` configuration" but the YAML did not use a `directories` field. The `storage.directories` field was deprecated and removed from the Rook CRD in recent versions.
- **What was changed:** Updated the text to "For a quick Kind test on a cluster with loop devices attached, use the following configuration" to accurately describe what the config does.
- **Why:** Referencing a removed CRD field is misleading and would confuse readers checking current documentation.

### 3. Cleanup loop device mismatch (Cleanup section)
- **What was wrong:** The cleanup used `losetup -d /dev/loop1$i` for `i in 1 2 3`, expanding to `/dev/loop11`, `/dev/loop12`, `/dev/loop13`. However, Step 2 assigned loop devices dynamically with `losetup -f --show`, which could assign any available loop number. The cleanup would target the wrong devices.
- **What was changed:** Replaced hardcoded device paths with `losetup -j /tmp/ceph-osd-$i.img | cut -d: -f1` to find the correct loop device by its backing file, with a guard to only detach if found.
- **Why:** `losetup -j <file>` reliably finds the loop device associated with a specific backing file, making cleanup correct regardless of which device numbers were assigned.

## Review Notes
- The Ceph image `v18.2.0` (Reef) is outdated. Rook's current supported versions are v19 (Squid) and v20 (Tentacle). The post correctly sets `allowUnsupported: true` to accommodate this, but readers targeting current Rook releases should consider updating to a supported Ceph version.
- Step 6 references `deploy/rook-ceph-tools` for running `ceph status`, but the post does not show deploying the Rook toolbox. Readers would need to separately apply `toolbox.yaml` from the Rook examples.
- The CephCluster config with `useAllDevices: false` and no explicit device or directory list will not create OSDs. Readers following the loop device approach from Steps 2-3 may want to set `useAllDevices: true` or explicitly list devices under `storage.devices` for the OSDs to be discovered.
- The Rook repository still uses `master` as its default branch, so the raw GitHub URL for the PVC example is correct.
