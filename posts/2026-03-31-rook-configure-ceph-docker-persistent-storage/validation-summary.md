# Validation Summary: How to Configure Ceph with Docker for Persistent Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD block storage, CephFS)
- Rook (Ceph operator for Kubernetes)
- Docker (bind mounts, container volumes)
- kubectl (Kubernetes CLI)
- ceph-fuse (FUSE-based CephFS client)
- rbd (RADOS Block Device CLI)

## Sources Consulted
- Ceph official documentation — rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph source code (config.cc, ceph_argparse.cc) for CLI flag verification: https://github.com/ceph/ceph
- Rook source code (keyring/admin.go, keyring/store.go) for secret name verification: https://github.com/rook/rook
- Docker daemon.json reference: https://docs.docker.com/reference/cli/dockerd/
- Docker storage driver documentation: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker volume plugins documentation: https://docs.docker.com/engine/extend/plugins_volume/
- Ceph CephX authentication configuration reference: https://docs.ceph.com/en/reef/rados/configuration/auth-config-ref/

## Issues Found

1. **Invalid `--monitor` flag on `rbd map` command**: The `--monitor` flag does not exist in Ceph CLI tools. Changed to `-m`, which is the documented short form (long form: `--mon_host` or `--mon-host`). Source: Ceph rbd man page and `config.cc` source code.

2. **`-it` flag on `kubectl exec` when capturing output in a variable**: Using `-t` (allocate TTY) with command substitution `$()` injects carriage return (`\r`) characters into the captured value, which would corrupt the Ceph authentication key and cause subsequent `rbd map` commands to fail. Removed `-it` flags from the `kubectl exec` command used to capture `CLIENT_KEY`.

3. **Misleading daemon.json configuration section**: The section "Create a Docker Volume with RBD" showed a `/etc/docker/daemon.json` configuration with `storage-driver: overlay2` and `default-address-pools`, claiming it configured Docker for RBD volume mapping. These settings control container layer storage and network address allocation respectively — they have no relation to Ceph RBD. Docker has no native RBD volume driver; RBD integration requires either third-party volume plugins or manual host-side mapping with bind mounts. Removed the misleading daemon.json snippet and renamed the section to "Automate RBD Mapping with a Helper Script".

4. **`--key` flag replaced with `--keyfile`**: The `--key` flag (passing secret directly on command line) is not documented in the `rbd map` man page and is marked "not recommended" in Ceph configuration reference. Changed to `--keyfile <(echo "$CLIENT_KEY")` which uses the documented `--keyfile` flag with process substitution. This also avoids exposing the key in process listings.

## Review Notes
- The CephFS section references `/etc/ceph/ceph.conf` but the post does not include steps to create this file on the Docker host. Readers would need to extract it from the Rook cluster (e.g., from the toolbox pod) for `ceph-fuse` to work. This is a documentation gap but not a code error.
- The `rook-ceph-admin-keyring` secret name and `{.data.keyring}` jsonpath were verified as correct against the Rook source code (keyring/admin.go and keyring/store.go).
- The `rbd device list | awk '{print $5}'` in the helper script correctly extracts the device path when the namespace column is empty (awk collapses whitespace), which is the default case.
