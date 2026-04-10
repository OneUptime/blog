# Validation Summary: How to Set Up Ceph for Development and Testing Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (vstart.sh development cluster)
- Rook (Kubernetes Ceph operator)
- Minikube (local Kubernetes)
- kind (Kubernetes in Docker)
- Helm (Kubernetes package manager)
- kubectl

## Sources Consulted
- Ceph developer documentation (`doc/dev/quick_guide.rst`) for vstart.sh behavior and default pool creation
- Ceph source code (`src/vstart.sh`) for verifying which pools are created by default
- Ceph source code (`src/mon/OSDMonitor.cc`) for pool size safety check behavior
- Rook official documentation (https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/) for Helm installation steps
- Rook Helm chart repository (https://charts.rook.io/release) for correct repo name and URL
- Ceph CLI reference for `ceph osd pool create` and `ceph osd pool set` syntax

## Issues Found

1. **Missing pool creation before `rados` command (Option 1)**: The `./bin/rados -p test put myobject /etc/hosts` command referenced a pool named "test" that does not exist after running `vstart.sh -n`. The script creates `cephfs_data_a` and `cephfs_metadata_a` by default, but not "test". Added `./bin/ceph osd pool create test` before the `rados put` command.

2. **Missing `helm repo add` command (Option 2)**: The `helm install rook-ceph rook-release/rook-ceph` command would fail because the `rook-release` Helm repository was never added. Added `helm repo add rook-release https://charts.rook.io/release` before the install command.

3. **Missing `--yes-i-really-mean-it` flag for pool size 1 (Dev-Specific Configuration)**: The command `ceph osd pool set dev-pool size 1` would fail with `Error EPERM` because Ceph requires the `--yes-i-really-mean-it` safety flag when setting replication size below 2. Added the required flag.

## Review Notes
- The section title "Option 3 - kind with Local Path Provisioner" mentions Local Path Provisioner but the section only covers creating a kind cluster with extra mounts — it does not install the Local Path Provisioner itself. This is slightly misleading but not a technical error in the code.
- The Ceph image `quay.io/ceph/ceph:v18.2.2` (Reef) is valid but readers should check for newer patch releases.
- The `vstart.sh` build-from-source approach can take a very long time; the post correctly notes this is an option alongside installing debug packages, but readers should be aware compilation may take 30+ minutes depending on hardware.
