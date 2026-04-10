# Validation Summary: How to Configure Ceph with Podman for Persistent Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestration on Kubernetes)
- Ceph RBD (RADOS Block Device)
- CephFS (Ceph Filesystem via FUSE)
- Podman (rootful and rootless container runtime)
- SELinux volume labeling (`:Z` and `:z` flags)
- systemd service integration

## Sources Consulted
- Ceph official documentation — ceph-fuse man page: https://docs.ceph.com/en/reef/man/8/ceph-fuse/
- Ceph official documentation — Mount CephFS using FUSE: https://docs.ceph.com/en/reef/cephfs/mount-using-fuse/
- Ceph official documentation — RBD commands: https://docs.ceph.com/en/reef/man/8/rbd/
- Podman documentation — volume mount options and SELinux: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman documentation — `--security-opt` flag: https://docs.podman.io/en/latest/markdown/options/security-opt.html
- Docker Hub — official PostgreSQL image: https://hub.docker.com/_/postgres
- Rook-Ceph operator source code for admin keyring secret naming (`rook-ceph-admin-keyring`)

## Issues Found
1. **Incorrect Docker image name for PostgreSQL**: The post used `docker.io/library/postgresql:15`, but the official Docker Hub image is named `postgres`, not `postgresql`. Pulling `postgresql:15` would fail with an image-not-found error. Fixed to `docker.io/library/postgres:15`.

## Review Notes
- The `ceph-fuse --name client.admin` syntax is technically valid but unconventional. Ceph documentation typically uses the short form `-n client.admin` or the simpler `--id admin` (which auto-prefixes `client.`). Not changed since it is functionally correct.
- The SELinux label usage is correct and follows best practice: `:Z` (private/unshared) for the single-container RBD mount and `:z` (shared) for the multi-container CephFS mounts.
- The `--security-opt label=type:container_file_t` uses the correct Podman syntax with `=` separator.
- The systemd unit file is a reasonable pattern for ensuring the RBD device is mapped before the container service starts, though in production environments users may want to add `After=network-online.target` and handle the mount step as well.
- The post correctly notes that `/dev/rbd0` is used after mapping, but in practice the device number may vary. Using `rbd device list` or the output of `rbd map` to capture the actual device path would be more robust. Not changed as this is a simplification appropriate for a tutorial.
