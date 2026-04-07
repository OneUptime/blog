# Validation Summary: How to Set Up Content Delivery Caching with Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- RADOS cache tiering
- D3N (Datacenter Data Delivery Network) caching
- Nginx reverse proxy caching
- Kubernetes (kubectl, ConfigMap)

## Sources Consulted
- Ceph official documentation — RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph official documentation — D3N data cache: https://docs.ceph.com/en/latest/radosgw/d3n_datacache/
- Ceph official documentation — Cache tiering (deprecated): https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Nginx official documentation — proxy_cache_path directive: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Rook documentation — Ceph Object Store: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found

1. **D3N config option names were incorrect (all three)**
   - `rgw_d3n_l1_local_datacenter_cache_enabled` → fixed to `rgw_d3n_l1_local_datacache_enabled`
   - `rgw_d3n_l1_datacenter_cache_size` → fixed to `rgw_d3n_l1_datacache_size`
   - `rgw_d3n_l1_local_datacenter_cache_dir` → fixed to `rgw_d3n_l1_datacache_persistent_path`
   - **Why:** The D3N options use "datacache" (one word), not "datacenter_cache". The directory option is named `datacache_persistent_path`, not a `cache_dir` variant. Using the wrong names would cause silent failures where the settings are ignored.

2. **Nginx config missing required `http {}` and `events {}` blocks**
   - The `proxy_cache_path` directive and `server` block must be inside an `http {}` context. The `events {}` block is also mandatory in any nginx.conf. Without these, nginx would fail to start with a configuration error.
   - **Fix:** Wrapped the existing config in proper `events {}` and `http {}` blocks.

3. **Cache tiering is deprecated — no warning present**
   - RADOS cache tiering has been deprecated since Ceph Luminous (12.x, 2017) and is not recommended for production. The post presented it as a current, viable approach.
   - **Fix:** Added a deprecation warning with recommended alternatives (BlueStore mixed device classes, dm-cache/bcache).

## Review Notes
- The `rgw_cache_expiry_interval` option in the RGW Object Cache section could not be confirmed in official Ceph documentation. It may not be a valid config option. However, since Ceph has many undocumented or version-specific options, this was left unchanged but should be verified by the author against the target Ceph version.
- The `ceph tell client.rgw.my-store perf dump` command uses a generic daemon name. In Rook deployments, the actual daemon name includes an instance suffix (e.g., `client.rgw.my-store.a`). Readers may need to adjust this to match their environment.
- The Summary section mentions "RADOS cache tiering" without noting its deprecated status. The deprecation warning was added to the relevant section but the summary was left unchanged to preserve the author's structure.
