# Validation Summary: How to Configure the ElasticSearch Sync Module for RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (realms, zonegroups, zones)
- Ceph ElasticSearch Sync Module
- Elasticsearch
- Rook (CephObjectStore CRD)
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation: ElasticSearch Sync Module (https://docs.ceph.com/en/latest/radosgw/elastic-sync-module/)
- Ceph source code: `src/rgw/driver/rados/rgw_sync_module_es.cc` (https://github.com/ceph/ceph/blob/main/src/rgw/driver/rados/rgw_sync_module_es.cc) — verified tier-config parameter names, list separators, and index naming logic
- Ceph official documentation: Multisite Configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph official documentation: Sync Modules (https://docs.ceph.com/en/latest/radosgw/sync-modules/)
- Rook documentation: CephObjectStore CRD (https://rook.io/docs/rook/latest/CRDs/specification/)

## Issues Found

### 1. Non-existent `index_all_tags` tier-config parameter
**What was wrong:** Step 3 used `--tier-config=explicit_custom_meta=false,index_all_tags=true`. The `index_all_tags` parameter does not exist in the Ceph RGW ElasticSearch sync module. Tags are indexed unconditionally from object attributes in the `es_obj_metadata::dump()` function.
**What was changed:** Removed `index_all_tags=true` from the command. The command now only sets `explicit_custom_meta=false`.
**Why:** Using a non-existent parameter would be silently ignored or could cause an error, and misleads readers into thinking tag indexing is configurable at the zone level.

### 2. Non-existent `custom_meta_list` tier-config parameter
**What was wrong:** Step 3 included a command using `--tier-config=explicit_custom_meta=true,custom_meta_list=x-amz-meta-owner:x-amz-meta-project:x-amz-meta-content-type`. The `custom_meta_list` parameter does not exist in the Ceph source code. Custom metadata indexing is configured per-bucket via `bucket_info.mdsearch_config`, not via zone-level tier-config.
**What was changed:** Replaced the `custom_meta_list` command with the real `approved_owners_list` parameter, which restricts indexing to specific bucket owners (a documented, comma-separated tier-config parameter).
**Why:** The original command would not work. `approved_owners_list` is a real parameter that serves a similar filtering purpose and is more useful as a tutorial example.

### 3. Incorrect separator for `index_buckets_list`
**What was wrong:** The post used colon-separated values: `index_buckets_list=bucket1:bucket2:bucket3`.
**What was changed:** Fixed to comma-separated: `index_buckets_list=bucket1,bucket2,bucket3`.
**Why:** The Ceph source code (`ItemList::parse()`) uses `get_str_list(str, ",", l)` which splits on commas. Colons would be treated as a single bucket name containing colons.

### 4. Incorrect Elasticsearch index naming pattern
**What was wrong:** Step 5 queried `rgw-primary-*` as the Elasticsearch index pattern.
**What was changed:** Fixed to `rgw-myrealm-*`.
**Why:** The Ceph source code generates index paths as `rgw-{realm_name}-{hex_instance_id}`. Since the realm created in Step 1 is named `myrealm`, the correct index pattern is `rgw-myrealm-*`, not `rgw-primary-*` (which would reference a zone name, not the realm name).

## Review Notes
- The CephObjectStore YAML in Step 4 is a valid Rook CRD but does not explicitly wire up the Elasticsearch zone. In a Rook-managed cluster, zone configuration is typically handled through CephObjectZone CRDs rather than manual `radosgw-admin` commands. The blog's mixed approach (Rook CRD + manual CLI) works but may confuse readers using a fully Rook-managed deployment.
- The `radosgw --no-mon-config` command in Step 4 is valid for debugging/testing but is not recommended for production deployments.
- The `radosgw-admin sync error list --max-entries=20` command in Step 6 is valid.
- When `explicit_custom_meta=true`, per-bucket metadata search configuration must be set separately (not covered in this post). The post could benefit from mentioning this in a future update.
