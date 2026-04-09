# How to Fix POOL_APP_NOT_ENABLED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Health Check, Configuration

Description: Learn how to resolve POOL_APP_NOT_ENABLED in Ceph, a warning that a pool has no application tag set, which may indicate an orphaned or misconfigured pool.

---

## What Is POOL_APP_NOT_ENABLED?

`POOL_APP_NOT_ENABLED` is a Ceph health warning that fires when one or more pools do not have an application tag set. Application tags were introduced in Ceph Luminous to indicate which Ceph service uses a pool (e.g., `rbd` for block storage, `cephfs` for filesystem, `rgw` for object storage).

Without an application tag, Ceph cannot determine the purpose of the pool, which may indicate the pool is orphaned, was created manually for testing, or was created before application tagging was introduced.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] POOL_APP_NOT_ENABLED: 2 pool(s) do not have an application enabled
    application not enabled on pool 'test-pool'
    application not enabled on pool 'scratch'
```

List all pools and their application tags:

```bash
ceph osd pool application get <pool-name>
```

Or for all pools:

```bash
ceph osd pool ls detail | grep -A 1 "^pool"
```

## Fix - Set the Application Tag

### For RBD (Block Storage) Pools

```bash
ceph osd pool application enable <pool-name> rbd
```

### For CephFS Pools

CephFS uses separate data and metadata pools:

```bash
ceph osd pool application enable <fs-data-pool> cephfs
ceph osd pool application enable <fs-metadata-pool> cephfs
```

### For RGW (Object Storage) Pools

```bash
ceph osd pool application enable default.rgw.buckets.data rgw
ceph osd pool application enable default.rgw.buckets.index rgw
ceph osd pool application enable default.rgw.meta rgw
```

### For Custom Applications

You can also tag pools with custom application names:

```bash
ceph osd pool application enable my-pool my-app
```

### Setting Application Metadata

You can also set key-value metadata on an application tag:

```bash
ceph osd pool application set <pool-name> <app-name> <key> <value>
```

## Checking Which Application to Use

If you are unsure which application a pool belongs to, check what's stored in it:

```bash
rados -p <pool-name> ls | head -5
```

Object names can indicate the type:
- `rbd_header.*` - RBD pool
- `default.rgw.*` - RGW pool
- `<inode_hex>.<offset_hex>` (e.g., `10000000000.00000000`) - CephFS data pool

## Deleting Truly Orphaned Pools

First enable pool deletion if not already enabled:

```bash
ceph config set mon mon_allow_pool_delete true
```

Then remove the pool:

```bash
ceph osd pool rm <pool-name> <pool-name> --yes-i-really-really-mean-it
```

## Summary

`POOL_APP_NOT_ENABLED` warns that pools lack application tags, which identify their purpose within Ceph. Fix it by running `ceph osd pool application enable <pool> <app>` with the appropriate tag (`rbd`, `cephfs`, `rgw`, or a custom name). Delete pools that are confirmed to be unused orphans. Application tags are required metadata for Ceph to properly manage and monitor pools.
