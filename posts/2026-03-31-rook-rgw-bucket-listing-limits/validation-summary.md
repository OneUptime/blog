# Validation Summary: How to Set Bucket Listing Limits in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 API (ListObjects, ListObjectsV2, ListBuckets)
- AWS CLI (s3 and s3api subcommands)
- Ceph bucket index sharding and dynamic resharding

## Sources Consulted
- Ceph official documentation on RGW configuration options: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph official documentation on bucket index sharding and resharding: https://docs.ceph.com/en/latest/radosgw/dynamicresharding/
- Ceph source code for default config values (rgw_max_listing_results, rgw_list_buckets_max_chunk)
- AWS S3 API reference for ListObjectsV2: https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html

## Issues Found

1. **Wrong config option for object listing limits**: The post used `rgw_list_buckets_max_chunk` throughout as if it controlled object listing within a bucket (ListObjects/ListObjectsV2). In reality, `rgw_list_buckets_max_chunk` controls the chunk size when listing *buckets* in an account (S3 ListBuckets). The correct parameter for controlling the maximum number of objects returned per listing page is `rgw_max_listing_results`. Fixed by replacing `rgw_list_buckets_max_chunk` with `rgw_max_listing_results` in the object listing context, and clarifying that `rgw_list_buckets_max_chunk` applies to bucket-level listing.

2. **Non-existent config option `rgw_default_max_tag_list_entries`**: The "Key Listing Parameters" section referenced `rgw_default_max_tag_list_entries`, which is not a standard or documented Ceph RGW configuration option. Removed and replaced with a check for `rgw_list_buckets_max_chunk` alongside `rgw_max_listing_results`.

3. **Contradictory advice on `rgw_list_buckets_max_chunk`**: The post first set `rgw_list_buckets_max_chunk` to 1000, then immediately suggested setting it to 10000 for admin listing. This was confusing and also wrong since the parameter doesn't control object listing at all. Fixed by separating the object listing config (`rgw_max_listing_results`) from the bucket listing config (`rgw_list_buckets_max_chunk`).

## Review Notes
- The resharding commands (`radosgw-admin bucket reshard`, `reshard list`, `reshard process`) are correct.
- The `rgw_override_bucket_index_max_shards`, `rgw_dynamic_resharding`, and `rgw_max_objs_per_shard` config options are correct and properly documented.
- The zone get/set workflow for configuring `bucket_index_max_shards` is correct.
- The AWS CLI examples for testing listing performance are correct, including the `--endpoint-url` flag for pointing to a Rook-deployed RGW instance.
