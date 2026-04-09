# Validation Summary: How to Optimize Ceph RGW Bucket Listing Performance

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 API (ListObjects / ListObjectsV2)
- RADOS (bucket index storage)
- AWS CLI (s3api)

## Sources Consulted
- [Ceph RGW Config Reference](https://docs.ceph.com/en/latest/radosgw/config-ref/) — verified `rgw_dynamic_resharding`, `rgw_max_objs_per_shard`, `rgw_override_bucket_index_max_shards`, and `rgw_bucket_index_max_aio` options
- [Ceph radosgw-admin man page](https://docs.ceph.com/en/latest/man/8/radosgw-admin/) — verified `bucket reshard`, `reshard status`, `bucket check`, and `bucket sync status` subcommands
- [Ceph RGW Dynamic Resharding docs](https://docs.ceph.com/en/latest/radosgw/dynamicresharding/) — verified reshard workflow and configuration
- [Ceph source: rgw.yaml.in](https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in) — confirmed `rgw_bucket_index_max_aio` default is 128 and controls AIO parallelism, not caching
- [Ceph RADOS Bucket Index developer docs](https://docs.ceph.com/en/reef/dev/radosgw/bucket_index/) — confirmed bucket index architecture claims

## Issues Found

### Issue 1: "Listing Cache" section was incorrect (lines 73-80)
- **What was wrong:** The section titled "Listing Cache" claimed that `rgw_bucket_index_max_aio` enables a listing cache to avoid repeated full bucket index scans. This is incorrect — `rgw_bucket_index_max_aio` controls the maximum number of concurrent asynchronous I/O requests when reading bucket index shards (default: 128). There is no dedicated listing cache in Ceph RGW. Additionally, the suggested value of `8` would *reduce* concurrency from the default of 128, likely *degrading* performance.
- **What was changed:** Renamed the section to "Bucket Index AIO Tuning", rewrote the description to accurately explain what the option controls, and changed the command from `ceph config set` (with a harmful value of 8) to `ceph config get` so users can inspect their current setting.

### Issue 2: "Ordered vs Unordered Listing" section was misleading (lines 61-71)
- **What was wrong:** The section title implied users could choose between ordered and unordered listing via the S3 API, and the text suggested using "ListObjectsV2 with delimiter-based pagination" to avoid ordering. Both ListObjects and ListObjectsV2 return results in lexicographic order per the S3 specification. Delimiters are for hierarchical prefix-based filtering, not pagination — continuation tokens handle pagination.
- **What was changed:** Renamed the section to "Efficient Pagination" and rewrote the description to correctly explain that ListObjectsV2 with continuation tokens provides efficient pagination through large buckets, without the incorrect claim about avoiding ordering.

### Issue 3: Invalid `radosgw-admin bucket check-object-index` command (line 92)
- **What was wrong:** `bucket check-object-index` is not a valid `radosgw-admin` subcommand. The comment also incorrectly described this as checking for "orphaned objects."
- **What was changed:** Replaced with the correct command `radosgw-admin bucket check --check-objects --bucket=my-bucket` and updated the comment to "Check objects against the bucket index."

## Review Notes
- The `rgw_dynamic_resharding` option defaults to `true` in recent Ceph versions (Quincy+), so the command to enable it may be redundant for newer clusters. This is not incorrect, just worth noting.
- The `radosgw-admin bucket sync status` command is only relevant in multisite deployments. The post does not clarify this, which could confuse users running single-site clusters. Not a technical error, but a potential clarity improvement.
- The `bucket stats` Python one-liner assumes `num_shards` is at the top level of the JSON output, which is correct for current Ceph versions.
