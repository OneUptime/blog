# How to Dump Ceph Cluster Configuration in Full

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Configuration, Cluster, Admin, CLI

Description: Extract the full Ceph cluster configuration including runtime values, per-daemon settings, and stored options using ceph config and ceph-conf commands.

---

## Why Dump the Full Configuration?

Dumping the full cluster configuration is essential for audits, debugging unexpected behavior, migrating clusters, and documenting the current state of all settings. Ceph's configuration is split across the config file, the centralized config store (mons), and runtime overrides.

## Dumping the Centralized Config Store

Since Ceph Mimic, configuration is primarily stored in the monitors' key-value store. Dump all keys:

```bash
ceph config dump
```

Sample output:

```text
WHO              MASK  LEVEL     OPTION                    VALUE              RO
global                  basic    auth_cluster_required     cephx
global                  basic    auth_service_required     cephx
osd                     advanced osd_recovery_max_active   3
client.rgw.zone1        advanced rgw_frontends             beast port=7480
```

## Filtering by Daemon Type

Dump only OSD settings:

```bash
ceph config dump | grep "^osd"
```

Dump settings for a specific daemon:

```bash
ceph config get osd.0
```

## Getting the Effective Config for a Running Daemon

Combines defaults, config file, mon store, and runtime overrides:

```bash
ceph config show osd.0
```

Show all options including defaults:

```bash
ceph config show-with-defaults osd.0
```

## Dumping the ceph.conf File

On any cluster node, view the current ceph.conf:

```bash
cat /etc/ceph/ceph.conf
```

Generate a minimal ceph.conf from the monitor config:

```bash
ceph config generate-minimal-conf
```

## Exporting All Options to a File

Create a full snapshot of the config for backup:

```bash
ceph config dump --format json > /tmp/ceph-config-$(date +%Y%m%d).json
```

## Checking a Specific Config Key

```bash
ceph config get mon auth_allow_insecure_global_id_reclaim
```

Get the value as seen by a running daemon:

```bash
ceph daemon osd.0 config get osd_max_write_size
```

## Comparing Runtime vs. Stored Config

Sometimes runtime config differs from stored config due to temporary overrides:

```bash
# Stored in mon
ceph config get osd.0 osd_recovery_max_active

# Runtime value
ceph tell osd.0 config get osd_recovery_max_active
```

If they differ, a runtime override was applied via `ceph tell ... injectargs` or `ceph daemon ... config set` (both ephemeral and non-persistent), or a local `ceph.conf` file has different values.

## Summary

Use `ceph config dump` to see all explicitly configured options in the centralized store, `ceph config show osd.<id>` for the effective config of a specific daemon, and `ceph config generate-minimal-conf` to produce a portable ceph.conf. Export with `--format json` for automation and auditing.
