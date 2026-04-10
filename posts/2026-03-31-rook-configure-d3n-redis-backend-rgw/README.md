# How to Configure D3N Redis Backend for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, Redis, RGW, Cache, Object Storage

Description: Configure Redis as the distributed cache backend for D3N in Ceph RGW to coordinate cache state across multiple RGW instances in a zone.

---

## Overview

D3N (Datacenter-Data-Delivery Network) is a local read-through cache for RGW that uses high-speed storage such as NVMe SSDs or DRAM to cache frequently accessed objects on each RGW node. Each RGW instance maintains its own independent local cache. D3N does not use Redis for cross-instance coordination; that capability belongs to D4N, a newer distributed caching architecture. This guide covers configuring D3N's local SSD cache on RGW instances.

## Prerequisites

- Ceph cluster with RGW configured
- High-speed local storage (NVMe SSD) available on RGW hosts

## Configuring D3N on RGW

First, create the cache directory on each RGW host:

```bash
mkdir -p /var/lib/ceph/rgw/cache
```

Set the D3N configuration via Ceph config:

```bash
# Enable D3N local datacache
ceph config set client.rgw.myzone rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 10737418240
```

Or in `ceph.conf`:

```ini
[client.rgw.myzone]
rgw_d3n_l1_local_datacache_enabled = true
rgw_d3n_l1_datacache_persistent_path = /var/lib/ceph/rgw/cache
rgw_d3n_l1_datacache_size = 10737418240
```

**Note:** D3N will not cache objects compressed by RGW-level compression (OSD-level compression is supported) or objects encrypted by RGW encryption. D3N will also be disabled if `rgw_max_chunk_size` differs from `rgw_obj_stripe_size`.

## Verifying D3N Cache

```bash
# Check that the cache directory is being populated
ls -la /var/lib/ceph/rgw/cache/

# Verify D3N configuration is active
ceph config get client.rgw.myzone rgw_d3n_l1_local_datacache_enabled
```

## Restart RGW After Configuration

```bash
# Rook-managed RGW - delete pods to trigger restart
kubectl -n rook-ceph delete pod -l app=rook-ceph-rgw

# Systemd-managed RGW
systemctl restart ceph-radosgw@rgw.myzone
```

## Summary

D3N provides a local read-through cache on each RGW node using high-speed storage like NVMe SSDs. It improves read performance for frequently accessed objects by avoiding repeated fetches from the backend RADOS cluster. Each RGW instance maintains its own independent cache. For distributed cache coordination across multiple RGW instances using Redis, see the Ceph D4N documentation instead.
