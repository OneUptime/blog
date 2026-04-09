# How to Use Orphan List and Tooling for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Maintenance, Cleanup, Object Storage, Orphan, Administration

Description: Learn how to identify and clean up orphaned RADOS objects in Ceph RGW using the orphan list and find tools to reclaim wasted storage.

---

Over time, Ceph RGW clusters can accumulate orphaned RADOS objects - data objects that are no longer referenced by any bucket index. This happens due to interrupted multipart uploads, incomplete deletions, or bugs. The `radosgw-admin` orphan tooling helps identify and optionally remove these objects.

## What Are Orphaned Objects

Orphaned objects exist in the data pool (`default.rgw.buckets.data`) but have no corresponding entry in any bucket index. Common causes:

- Aborted multipart uploads where parts were uploaded but never completed
- Network failures during deletion that left data objects behind
- Inconsistencies from interrupted resharding operations

## Generating an Orphan List

> **Note:** The `radosgw-admin orphans` subcommands (`find`, `finish`, `list-jobs`) are deprecated. For new deployments, use the `rgw-orphan-list` tool instead.

The `orphans find` command scans the data pool and cross-references the bucket index to find unreferenced objects. Orphan object names are printed to stdout, so redirect the output to capture them:

```bash
radosgw-admin orphans find \
  --pool default.rgw.buckets.data \
  --job-id orphan-job-1 > orphan-results.txt
```

This is a read-only scan. Intermediate scan data is stored as RADOS objects in the `default.rgw.log` pool.

## Checking Job Status

```bash
radosgw-admin orphans list-jobs
```

## Cleaning Up a Completed Job

After you have captured the orphan list, clean up the intermediate RADOS objects stored in the log pool:

```bash
radosgw-admin orphans finish --job-id orphan-job-1
```

## Alternative: radosgw-admin bucket check

For a per-bucket approach, check index consistency:

```bash
radosgw-admin bucket check --check-objects --bucket mybucket
```

This cross-references the bucket index against actual RADOS objects and reports objects in the index with no data object, and vice versa.

Fix index inconsistencies:

```bash
radosgw-admin bucket check --check-objects --bucket mybucket --fix
```

## Cleaning Up Incomplete Multipart Uploads

Most orphaned data comes from incomplete multipart uploads. List and abort them:

```bash
# List incomplete multipart uploads
aws s3api list-multipart-uploads \
  --bucket mybucket \
  --endpoint-url http://your-rgw-host:7480

# Abort a specific multipart upload
aws s3api abort-multipart-upload \
  --bucket mybucket \
  --key myfile.txt \
  --upload-id upload-id-here \
  --endpoint-url http://your-rgw-host:7480
```

Automate cleanup with a lifecycle rule:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket mybucket \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "abort-incomplete-mpu",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
    }]
  }' \
  --endpoint-url http://your-rgw-host:7480
```

## Summary

Ceph RGW orphan tooling helps locate RADOS objects that are consuming storage but are no longer referenced. Use `radosgw-admin orphans find` for a cluster-wide scan, `bucket check` for per-bucket analysis, and lifecycle rules to proactively abort incomplete multipart uploads before they accumulate.
