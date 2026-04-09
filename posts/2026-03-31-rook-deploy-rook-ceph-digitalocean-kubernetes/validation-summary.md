# Validation Summary: How to Deploy Rook-Ceph on DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Ceph v18.2.0 (Reef)
- DigitalOcean Kubernetes Service (DOKS)
- DigitalOcean Block Storage Volumes
- doctl CLI
- Helm
- Kubernetes StorageClass / CSI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook GitHub StorageClass example: https://raw.githubusercontent.com/rook/rook/release-1.16/deploy/examples/csi/rbd/storageclass.yaml
- DigitalOcean Volumes documentation: https://docs.digitalocean.com/products/volumes/
- DigitalOcean Volumes naming conventions: https://docs.digitalocean.com/products/volumes/how-to/mount/
- doctl compute volume create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume/create/
- doctl compute volume-action attach reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume-action/attach/

## Issues Found

### 1. Duplicate volume names in creation loop (line 31)
**What was wrong:** The `doctl compute volume create ceph-osd` command was used inside a loop creating three volumes, but DigitalOcean requires unique volume names within a region. The second and third iterations would fail with a "Name has already been taken" error.
**What was changed:** Changed the volume name from `ceph-osd` to `ceph-osd-${DROPLET_ID}` to ensure uniqueness.

### 2. Incorrect device path reference (line 41)
**What was wrong:** The text said volumes appear "typically as `/dev/sda` or `/dev/vdb`". On DigitalOcean Droplets, the boot disk uses virtio (`/dev/vda`) and Block Storage volumes are attached as SCSI devices (`/dev/sda`, `/dev/sdb`, etc.). The `/dev/vdb` reference is incorrect for DigitalOcean.
**What was changed:** Removed `/dev/vdb` from the text, keeping only `/dev/sda`.

### 3. Wrong deviceFilter in CephCluster manifest (line 81)
**What was wrong:** `deviceFilter: "^vdb$"` would not match any DigitalOcean Block Storage volumes since they appear as SCSI devices (`/dev/sda`, `/dev/sdb`), not virtio devices (`/dev/vdb`).
**What was changed:** Changed to `deviceFilter: "^sd[a-z]$"` to correctly match DigitalOcean SCSI-attached Block Storage volumes while excluding the virtio boot disk.

### 4. Missing CSI secret parameters in StorageClass (lines 123-130)
**What was wrong:** The StorageClass was missing required CSI secret parameters. Without these, the RBD CSI provisioner cannot authenticate with Ceph, and PVC creation, volume expansion, and node mounting will all fail.
**What was changed:** Added the following required parameters:
- `csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node`
- `csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/fstype: ext4`

### 5. Missing Rook toolbox deployment (Step 4)
**What was wrong:** The post ran `kubectl exec -it deploy/rook-ceph-tools -- ceph status` but never deployed the Rook toolbox. The toolbox is not deployed automatically by the Rook operator Helm chart.
**What was changed:** Added commands to deploy the toolbox from the official Rook examples and wait for it to be available before running `ceph status`.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` (Reef) is valid and current as of the post date. Ceph Squid (v19.x) is also available but Reef remains supported.
- The Rook toolbox URL references `release-1.16`, which aligns with the latest stable Rook release. This URL may need updating for future Rook versions.
- The `doctl compute volume create` command does not specify `--fs-type`, meaning the volume will be unformatted (raw block), which is correct for Ceph OSD use.
- For production deployments, using `/dev/disk/by-id/scsi-0DO_Volume_*` paths would be more reliable than device names like `/dev/sda`, but the `deviceFilter` regex approach is adequate for this tutorial.
