# Validation Summary: How to Set rgwCommandFlags in Rook Object Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RADOS Gateway (RGW)
- Kubernetes (kubectl, CRDs)
- CephObjectStore CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook source code (`pkg/apis/ceph.rook.io/v1/types.go`) — confirms `RgwCommandFlags map[string]string` field in `GatewaySpec`
- Ceph Object Gateway config reference: https://docs.ceph.com/en/reef/radosgw/config-ref/

## Issues Found
No technical issues found.

## Review Notes
- The `rgwCommandFlags` field is correctly defined as a `map[string]string` under `spec.gateway` in the Rook CephObjectStore CRD, matching the blog post's YAML structure.
- All five listed Ceph config flags (`rgw_thread_pool_size`, `rgw_max_chunk_size`, `rgw_cache_lru_size`, `debug_rgw`, `rgw_enable_static_website`) are real, documented Ceph configuration options.
- The RGW deployment naming convention (`rook-ceph-rgw-<store-name>-a`) is correct.
- Minor note: `ceph config show` may not reflect values passed as CLI arguments via `rgwCommandFlags` (they override at the process level, not in the config store). The post correctly lists `ps aux | grep radosgw` as the primary verification method.
- The post does not mention the companion `rgwConfig` field (which applies settings via the Ceph config store at runtime without pod restarts). This is not an error — just a potential future enhancement.
- `rgw_thread_pool_size` is primarily relevant for the older civetweb frontend; the newer beast frontend handles threading differently. This could be noted but is not incorrect as stated.
