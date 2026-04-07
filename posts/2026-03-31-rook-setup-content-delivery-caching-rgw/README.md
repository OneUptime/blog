# How to Set Up Content Delivery Caching with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Caching, CDN

Description: Set up content delivery caching in front of Ceph RGW in Rook using RGW cache tiers, D3N data lake caching, and edge proxy caching to reduce latency and OSD load.

---

## Content Delivery Caching Overview

Ceph RGW supports several caching layers to reduce latency and OSD load for frequently accessed objects. Options include RGW's built-in object cache, Nginx proxy caching, and D3N (Datacenter Data Delivery Network) for datacenter-local caching.

## RGW Object Cache

Enable the built-in RGW object cache for metadata and small objects:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_cache_enabled true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_cache_lru_size 100000

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_cache_expiry_interval 900
```

## Cache Tiering with a Fast Pool

> **Warning:** RADOS cache tiering is deprecated since Ceph Luminous and is not recommended for production use. Consider using BlueStore with mixed device classes (WAL/DB on SSD, data on HDD) or dm-cache/bcache at the block level instead. The commands below are shown for reference only.

Set up a cache tier using SSD-backed pools to cache hot objects before they flow to the HDD data pool:

```bash
# Create cache pool on SSDs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create rgw-cache 128

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier add my-store.rgw.buckets.data rgw-cache

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier cache-mode rgw-cache writeback

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tier set-overlay my-store.rgw.buckets.data rgw-cache

# Set cache size and eviction thresholds
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set rgw-cache target_max_bytes 107374182400

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set rgw-cache cache_target_dirty_ratio 0.4

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set rgw-cache cache_target_full_ratio 0.8
```

## Nginx Proxy Caching Layer

Deploy an Nginx proxy in front of RGW for HTTP-level caching:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-rgw-cache
  namespace: rook-ceph
data:
  nginx.conf: |
    events {
      worker_connections 1024;
    }

    http {
      proxy_cache_path /var/cache/nginx levels=1:2
        keys_zone=rgw_cache:100m max_size=50g
        inactive=1h use_temp_path=off;

      server {
        listen 80;

        location / {
          proxy_cache rgw_cache;
          proxy_cache_valid 200 1h;
          proxy_cache_use_stale error timeout updating;
          proxy_cache_lock on;
          proxy_pass http://rook-ceph-rgw-my-store.rook-ceph.svc;
          proxy_set_header Host $host;
          add_header X-Cache-Status $upstream_cache_status;
        }
      }
    }
```

## D3N Read-Only Cache

Enable D3N for datacenter-local read caching on each RGW node:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_d3n_l1_local_datacache_enabled true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_d3n_l1_datacache_size 53687091200

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_d3n_l1_datacache_persistent_path /var/cache/ceph/rgw
```

## Cache Hit Rate Monitoring

Monitor cache effectiveness:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell client.rgw.my-store perf dump | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('rgw','{}'), indent=2))"
```

Check Nginx cache status with curl:

```bash
curl -I http://rgw-endpoint/my-bucket/my-object | grep X-Cache-Status
```

## Summary

Ceph RGW caching uses three complementary layers: the built-in object metadata cache for fast repeated lookups, RADOS cache tiering for hot data on SSDs, and an HTTP proxy cache for byte-range and full object caching at the application layer. Combining these layers significantly reduces OSD read load for popular content.
