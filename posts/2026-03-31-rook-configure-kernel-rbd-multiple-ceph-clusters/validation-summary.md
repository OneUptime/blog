# Validation Summary: How to Configure Kernel RBD with Multiple Ceph Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (block storage cluster)
- Kernel RBD module (kernel-level RBD device mapping)
- rbd-nbd (userspace NBD-based RBD mapping)
- rbdmap (systemd service for automatic RBD mapping at boot)
- systemd

## Sources Consulted
- Ceph rbdmap man page (Reef): https://docs.ceph.com/en/reef/man/8/rbdmap/
- rbdmap script source code: https://github.com/ceph/ceph/blob/main/src/rbdmap
- rbdmap.service.in systemd unit: https://github.com/ceph/ceph/blob/main/systemd/rbdmap.service.in
- Ceph rbd man page (Reef): https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph rbd-nbd man page (Reef): https://docs.ceph.com/en/reef/man/8/rbd-nbd/

## Issues Found

### 1. Incorrect rbdmap multi-cluster configuration (lines 98-114)

**What was wrong:** The post showed creating separate cluster-specific rbdmap files (`/etc/ceph/prod.rbdmap` and `/etc/ceph/dr.rbdmap`) and implied they would be automatically discovered by the standard `rbdmap` service. This is incorrect — the `rbdmap` service only reads a single file (`/etc/ceph/rbdmap` by default, controlled by the `RBDMAPFILE` environment variable). There is no glob or multi-file discovery.

**What was changed:** Replaced the two separate rbdmap files with a single `/etc/ceph/rbdmap` file containing entries for both clusters.

### 2. Missing `cluster` and `conf` parameters in rbdmap entries

**What was wrong:** The rbdmap entries only specified `id` and `keyring`, but omitted the `cluster` and `conf` parameters. Without these, `rbd device map` would default to the `ceph` cluster and read `/etc/ceph/ceph.conf`, failing to connect to the correct monitors for the prod or dr clusters.

**What was changed:** Added `cluster=prod,conf=/etc/ceph/prod.conf` and `cluster=dr,conf=/etc/ceph/dr.conf` to the respective rbdmap entries. The rbdmap script transforms comma-separated `key=value` pairs into `--key value` flags passed to `rbd device map`.

### 3. Misleading "per cluster" service enablement

**What was wrong:** The text said "Enable the rbdmap service per cluster" followed by `sudo systemctl enable rbdmap`, implying multiple services. The `rbdmap.service` unit is not a template unit — it is a single service instance.

**What was changed:** Changed text to "Enable the rbdmap service" (removed "per cluster" wording) since a single service now handles both clusters via the unified rbdmap file.

## Review Notes
- The Ceph configuration files (`prod.conf`, `dr.conf`) include `auth_cluster_required` and `auth_service_required`, which are cluster/service-side settings. For a client-only config, `auth_client_required = cephx` would be more relevant, though omitting it is not an error since it defaults to `cephx`.
- The `rbd device map`, `rbd device list`, and `rbd-nbd` commands are all correct and use current syntax.
- The cluster naming convention and config/keyring file naming patterns (`<cluster>.conf`, `<cluster>.client.<user>.keyring`) are correct per Ceph conventions.
