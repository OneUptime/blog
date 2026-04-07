# How to Write a ceph.conf Configuration File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, ceph.conf, Storage, Setup

Description: Learn how to write and structure a ceph.conf file, covering global settings, monitor addresses, OSD configuration, and client defaults.

---

## The Role of ceph.conf

`ceph.conf` is the main configuration file for Ceph daemons and clients. It defines cluster-wide settings, per-daemon overrides, and client-specific parameters. The file follows an INI-like format with sections for `[global]`, `[mon]`, `[osd]`, `[mds]`, `[client]`, and specific daemon instances like `[osd.0]`.

In modern Ceph (Nautilus+), most settings can be managed at runtime via `ceph config set`, but `ceph.conf` remains important for bootstrapping and for settings that must be present before a daemon starts.

## Basic ceph.conf Structure

```ini
[global]
; Cluster identity
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890
mon_initial_members = mon1, mon2, mon3
mon_host = 192.168.1.10, 192.168.1.11, 192.168.1.12

; Authentication
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx

; Networks
public_network = 192.168.1.0/24
cluster_network = 192.168.2.0/24

; Logging
log_to_file = true
log_file = /var/log/ceph/ceph.log

[mon]
mon_allow_pool_delete = true
mon_clock_drift_allowed = 0.1

[osd]
osd_journal_size = 1024
osd_pool_default_size = 3
osd_pool_default_min_size = 2
osd_pool_default_pg_num = 128
osd_recovery_max_active = 3
osd_max_backfills = 2

[client]
rbd_cache = true
rbd_cache_size = 268435456
```

## Global Section

The `[global]` section applies to all Ceph components:

```ini
[global]
; Required: unique cluster ID
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890

; Monitor bootstrap addresses
mon_initial_members = mon-a, mon-b, mon-c
mon_host = [v2:192.168.1.10:3300,v1:192.168.1.10:6789] \
           [v2:192.168.1.11:3300,v1:192.168.1.11:6789] \
           [v2:192.168.1.12:3300,v1:192.168.1.12:6789]

; Network
public_network = 192.168.1.0/24
cluster_network = 192.168.2.0/24

; Enable msgr2 protocol
ms_bind_msgr2 = true
```

## Per-Daemon Configuration

Override settings for specific daemon types:

```ini
[osd]
; Applicable to all OSD daemons
osd_scrub_begin_hour = 23
osd_scrub_end_hour = 6
osd_deep_scrub_interval = 604800

[osd.5]
; Only applies to OSD 5 (e.g., slower disk)
osd_max_write_size = 90

[mon.mon-a]
; Only applies to monitor mon-a
mon_data = /var/lib/ceph/mon/ceph-mon-a
```

## Client Configuration

The `[client]` section affects all Ceph clients:

```ini
[client]
; Enable RBD client-side caching
rbd_cache = true
rbd_cache_size = 67108864
rbd_cache_max_dirty = 50331648
rbd_cache_target_dirty = 33554432
rbd_cache_writethrough_until_flush = true

; Admin socket path for rados and rbd clients
admin_socket = /var/run/ceph/$cluster-$type.$id.$pid.$cctid.asok
```

## File Location and Permissions

```bash
# Standard location on Linux
ls -la /etc/ceph/ceph.conf

# File should be readable by ceph user
sudo chown root:ceph /etc/ceph/ceph.conf
sudo chmod 640 /etc/ceph/ceph.conf
```

## Validating ceph.conf

```bash
# Parse and validate the config file
ceph-conf --conf /etc/ceph/ceph.conf --show-config-value fsid

# List all effective settings for a daemon type
ceph-conf --conf /etc/ceph/ceph.conf --name osd.0 --show-config
```

## Pushing Config Updates with cephadm

In cephadm-managed clusters, avoid editing ceph.conf manually on nodes. Instead:

```bash
# Set config via ceph config
ceph config set osd osd_scrub_begin_hour 23

# Generate a minimal ceph.conf for reference
ceph config generate-minimal-conf

# Enable cephadm to manage /etc/ceph/ceph.conf on all hosts
ceph config set mgr mgr/cephadm/manage_etc_ceph_ceph_conf true
```

## Summary

A well-structured `ceph.conf` file defines the cluster FSID, monitor bootstrap addresses, network separation, authentication requirements, and per-daemon tuning. The INI-format hierarchy allows global defaults to be overridden at the daemon type or instance level. While runtime configuration via `ceph config set` is preferred for operational changes in modern clusters, `ceph.conf` remains the authoritative source for bootstrap-critical settings and defaults that new daemons need before connecting to monitors.
