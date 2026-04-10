# Validation Summary: How to Configure Data Caching and CDN with Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph Kubernetes operator)
- D4N (Datacenter-Data-Delivery-Network) distributed caching
- Redis (as D4N backend)
- Nginx (as caching reverse proxy)
- boto3 / Python (S3 pre-signed URL generation)
- AWS CLI (S3-compatible object upload)
- Kubernetes (CephObjectStore CRD)

## Sources Consulted
- Ceph RGW source code: `src/common/options/rgw.yaml.in` on `main` branch of `github.com/ceph/ceph` — definitive list of all RGW config options
- Ceph RGW cache header source: `rgw_cache.h` — confirms metadata-only cache scope
- Ceph official documentation: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph RGW Data Caching and CDN docs: https://docs.ceph.com/en/latest/radosgw/rgw-cache/
- boto3 S3 client documentation: `generate_presigned_url` API reference
- Nginx proxy_cache_path directive documentation

## Issues Found

1. **Fabricated config option `rgw_default_max_age`** (was line 53): This option does not exist in any Ceph version. There is no server-side RGW config to set a default `Cache-Control: max-age` header. Removed the incorrect `ceph config set` command and replaced the section text to clarify that cache headers must be set per-object at upload time via the S3 API.

2. **Incorrect cache content description** (was line 30-31): The post claimed the built-in RGW cache stores "Object metadata (headers, ACLs)" and "Small objects below the `rgw_max_chunk_size` threshold." The RGW metadata cache is metadata-only — it caches user info, bucket info, bucket instance info, ACLs, and extended attributes. It does NOT cache user data objects of any size. Corrected the bullet points.

3. **Non-existent D4N config option `rgw_d4n_l1_datacache_size`** (was line 41): This option does not exist. `rgw_d3n_l1_datacache_size` is the D3N (predecessor) equivalent. The correct D4N option is `rgw_d4n_l1_datacache_disk_reserve`, which has different semantics — it specifies disk space to keep free rather than a maximum cache size. Replaced with the correct option.

4. **Non-existent config option `rgw_datacache_enabled`** (was line 44): This option does not exist. D4N is enabled by setting `rgw_filter` to `d4n`, not via a separate boolean toggle. Replaced the incorrect command with `ceph config set client.rgw rgw_filter d4n`.

5. **Unused Python import `from datetime import datetime`** (was line 72): The `datetime` module was imported but never used in the pre-signed URL example. Removed the dead import.

## Review Notes
- D4N is still considered experimental in the Ceph source code. The post does not mention this caveat, which could be worth noting in a future update.
- The `rgw_cache_lru_size` default is `25000` in current Ceph versions (it was `10000` in older versions). The post sets it to `10000` as a custom value which is valid, but readers should be aware the default is higher.
- The Rook CephObjectStore YAML shown is a basic gateway spec and does not include any cache-specific configuration. It serves as a starting point but the actual cache tuning is done via `ceph config set` commands through the toolbox, which the post correctly shows.
- The Nginx caching proxy configuration is syntactically and semantically correct.
- The boto3 pre-signed URL code is correct after removing the unused import.
