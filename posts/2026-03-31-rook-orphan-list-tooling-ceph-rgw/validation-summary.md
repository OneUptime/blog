# Validation Summary: How to Use Orphan List and Tooling for Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI (orphans find, orphans finish, orphans list-jobs, bucket check)
- rgw-orphan-list (mentioned as modern replacement)
- AWS CLI (s3api) for S3-compatible operations against RGW
- S3 Lifecycle Configuration for multipart upload cleanup

## Sources Consulted
- Ceph official documentation: Orphan List and Associated Tooling (https://docs.ceph.com/en/reef/radosgw/orphans/)
- Ceph radosgw-admin man page source (https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst)
- Ceph rgw-orphan-list man page source (https://github.com/ceph/ceph/blob/main/doc/man/8/rgw-orphan-list.rst)
- Ceph source code: src/rgw/radosgw-admin/orphan.cc (verified orphans finish behavior)
- Ceph RGW Pools documentation (https://docs.ceph.com/en/latest/radosgw/pools/)
- Ceph HTTP Frontends documentation (https://docs.ceph.com/en/latest/radosgw/frontends/)
- AWS CLI: list-multipart-uploads reference (https://docs.aws.amazon.com/cli/latest/reference/s3api/list-multipart-uploads.html)
- AWS CLI: abort-multipart-upload reference (https://docs.aws.amazon.com/cli/latest/reference/s3api/abort-multipart-upload.html)
- AWS CLI: put-bucket-lifecycle-configuration reference (https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html)
- AWS S3 docs: Configuring lifecycle to abort incomplete multipart uploads (https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html)

## Issues Found

1. **`radosgw-admin orphans` commands are deprecated without any note**: The `orphans find`, `orphans finish`, and `orphans list-jobs` subcommands are deprecated in modern Ceph (Pacific and later). Added a deprecation note recommending the `rgw-orphan-list` tool as the replacement.

2. **`orphans finish` incorrectly described as exporting results**: The post stated that `orphans finish` exports the orphan list. Verified from source code (`src/rgw/radosgw-admin/orphan.cc`) that `orphans finish` only deletes/cleans up intermediate RADOS objects from the log pool. The actual orphan list is printed to stdout during `orphans find`. Fixed the description and added stdout redirect to the `orphans find` command example.

3. **False claim about local output files `orphan.find.job_id.*`**: The post claimed results are written to local files named `orphan.find.orphan-job-1.*`. This is incorrect - the intermediate data is stored as RADOS objects in the log pool with the prefix `orphan.scan`, not as local files, and `orphans find` outputs results to stdout. Removed the incorrect file listing section.

4. **`bucket check` missing `--check-objects` flag**: The post described `bucket check --bucket mybucket` as reporting "objects in the index with no data object, and vice versa." Without `--check-objects`, the command only verifies index stats (size and object count). The `--check-objects` flag is required to cross-reference the bucket index against actual RADOS objects. Added `--check-objects` to both the check and fix commands.

5. **Lifecycle configuration `Filter` field incorrect**: The lifecycle JSON used `"Filter": {}` (empty object), which is not a documented valid form. The correct way to apply a rule to all objects is `"Filter": {"Prefix": ""}` per AWS documentation. Ceph RGW's stricter XML-based parsing may reject the empty object variant. Fixed to use the documented form.

## Review Notes
- The `rgw-orphan-list` tool (the modern replacement) works differently from the deprecated commands - it stores intermediate results on the local filesystem rather than in the cluster, and produces a local file of orphan RADOS objects. A future revision could cover this tool in detail.
- The default RGW port 7480 is correct for default Ceph configuration (set via the `rgw_frontends` config option defaulting to `beast port=7480`).
- The `default.rgw.buckets.data` and `default.rgw.log` pool names are correct for the default zone. For custom zone names, the pool prefix would differ (e.g., `us-east.rgw.buckets.data`).
- Ceph RGW support for `AbortIncompleteMultipartUpload` lifecycle rules is confirmed working in modern releases (Pacific, Quincy, Reef, Squid).
