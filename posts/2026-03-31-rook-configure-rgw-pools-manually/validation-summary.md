# Validation Summary: How to Configure RGW Pools Manually

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Ceph OSD pool management (`ceph osd pool` commands)
- `radosgw-admin` CLI tool
- Rook Ceph Operator (`CephObjectStore` CRD)
- Erasure coding for Ceph pools

## Sources Consulted
- [Ceph Object Gateway Config Reference](https://docs.ceph.com/en/latest/radosgw/config-ref/)
- [Ceph RGW Pools Documentation](https://docs.ceph.com/en/latest/radosgw/pools/)
- [radosgw-admin man page](https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- [radosgw-admin help test (source of truth for subcommands)](https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t)
- [Ceph RGW options source (rgw.yaml.in)](https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in)
- [RADOS Gateway Data Layout](https://docs.ceph.com/en/latest/radosgw/layout/)
- [Pool Placement and Storage Classes](https://docs.ceph.com/en/latest/radosgw/placement/)
- [Rook CephObjectStore CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- [Rook deploy/examples/object-ec.yaml](https://github.com/rook/rook/blob/master/deploy/examples/object-ec.yaml)
- [Rook Block Pool CRD (pool parameters)](https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found

### 1. Fictional config option `rgw_create_pools` (Critical)
**What was wrong:** The section "Initialize RGW Without Auto Pool Creation" used `ceph config set client.rgw rgw_create_pools false` to disable auto pool creation. `rgw_create_pools` is not a valid Ceph configuration option — it does not exist in the Ceph RGW options source (`rgw.yaml.in`) or the official config reference. The only place this name appears in the Ceph ecosystem is as an Ansible task name in `ceph-ansible`, which is unrelated.

**What was changed:** Rewrote the section to explain that RGW automatically detects and uses pre-created pools. No special configuration is needed — simply pre-create the pools before starting RGW.

### 2. Fictional command `radosgw-admin pool init` (Critical)
**What was wrong:** The post instructed readers to run `radosgw-admin pool init` after disabling auto pool creation. This subcommand does not exist. The valid `pool` subcommands are: `pool add`, `pool rm`, and `pools list`.

**What was changed:** Removed the fictional command as part of the section rewrite in issue #1.

### 3. Misleading description of `default.rgw.buckets.non-ec` (Minor)
**What was wrong:** Described as "Non-EC data overflow," which is misleading. This pool (`data_extra_pool` in zone config) primarily stores multipart upload metadata — tracking objects that record which parts of a multipart upload have been written. It exists because EC pools do not support RADOS omap operations needed for this metadata. The pool is created even when the data pool is replicated (not EC).

**What was changed:** Updated the description from "Non-EC data overflow" to "Multipart upload metadata (data_extra_pool)."

### 4. Missing `default.rgw.otp` pool from default pools table (Minor)
**What was wrong:** The table of default RGW pools was missing `default.rgw.otp`, which is a separate RADOS pool created by default for MFA/TOTP token storage. This pool appears in the zone configuration as `otp_pool`.

**What was changed:** Added `default.rgw.otp` to the pools table and to both pool creation loops in the pre-creation script.

## Review Notes
- The `allow_ec_overwrites: "true"` parameter in the Rook CephObjectStore YAML is redundant — Rook automatically sets this for object store EC data pools. It is not technically incorrect (the parameter is accepted), but it is unnecessary. Left as-is since it does no harm and makes the intent explicit.
- The Rook YAML omits `failureDomain: host` and `requireSafeReplicaSize: true`, which are recommended for production but default correctly. Not an error.
- Many logical RGW "pools" (GC, lifecycle, reshard, usage logs, user keys/email/swift metadata, roles, notifications) are actually namespaces within `default.rgw.meta` and `default.rgw.log`, not separate RADOS pools. The post correctly lists only the actual RADOS pools.
- All `ceph osd pool` commands, `radosgw-admin zone` commands, and verification commands are syntactically correct and use valid flags.
