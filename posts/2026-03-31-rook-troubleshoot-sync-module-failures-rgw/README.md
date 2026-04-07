# How to Troubleshoot Sync Module Failures in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Sync, Troubleshooting

Description: Learn how to diagnose and resolve Ceph RGW sync module failures, from network connectivity issues to object-level retry and error recovery procedures.

---

## Overview

Ceph RGW sync module failures can manifest as growing sync lag, repeated error entries, or objects that never reach their destination. Root causes include network failures to the target system, permission errors, object size limits, or bugs in custom sync module code. This guide provides a structured troubleshooting workflow.

## Step 1 - Identify the Failure Type

```bash
# Check overall sync health
radosgw-admin sync status

# List sync errors with details
radosgw-admin sync error list --max-entries=50 \
  | jq '.[] | {
    timestamp,
    source_zone,
    key,
    error_code,
    error_message,
    attempts: .attempts_count
  }'

# Common error codes:
# ERR_NO_SUCH_BUCKET (404)  - Destination bucket does not exist
# ERR_ACCESS_DENIED (403)   - Credentials/permissions issue
# ERR_SERVICE_UNAVAILABLE   - Target is unreachable
# ERR_INTERNAL_ERROR        - Object read failure on source
```

## Step 2 - Enable Debug Logging

```bash
# Increase sync debug logging
kubectl -n rook-ceph exec deploy/rook-ceph-mgr-a -- \
  ceph config set client.rgw.my-store debug_rgw 20

# Restart the sync zone RGW
kubectl -n rook-ceph rollout restart deployment/rook-ceph-rgw-my-store-a

# Watch logs for the failing operation
kubectl -n rook-ceph logs -l app=rook-ceph-rgw -f \
  | grep -E "(sync|error|retry|timeout|connection)"
```

## Step 3 - Test Connectivity to the Sync Target

```bash
# For Elasticsearch sync - test connectivity
curl -v http://elasticsearch.logging.svc.cluster.local:9200/_cluster/health

# For cloud sync (AWS S3) - test credentials
aws --endpoint-url https://s3.amazonaws.com \
  s3 ls s3://my-archive-bucket/ --region us-east-1

# For custom sync - test the webhook endpoint
curl -X POST https://webhook.example.com/ceph-events \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check network policy allows RGW to reach the target
kubectl -n rook-ceph exec deploy/rook-ceph-rgw-my-store-a -- \
  nc -zv elasticsearch.logging.svc.cluster.local 9200
```

## Step 4 - Manually Retry Failed Objects

```bash
# Retry sync for a specific bucket
radosgw-admin bucket sync run \
  --bucket=mybucket \
  --source-zone=primary-zone

# Reset sync state for a bucket by disabling and re-enabling
radosgw-admin bucket sync disable \
  --bucket=mybucket \
  --source-zone=primary-zone
radosgw-admin bucket sync enable \
  --bucket=mybucket \
  --source-zone=primary-zone

# Trim the sync error log
radosgw-admin sync error trim \
  --source-zone=primary-zone
```

## Step 5 - Handle Elasticsearch Index Failures

```bash
# Check Elasticsearch index health
curl "http://elasticsearch:9200/_cat/indices/rgw-*?v"
curl "http://elasticsearch:9200/_cluster/health?pretty"

# Re-index a failed object manually
OBJECT_META=$(aws --endpoint-url http://rgw.example.com:7480 \
  s3api head-object --bucket mybucket --key myobject.txt)

# Push the metadata directly to Elasticsearch
curl -X PUT "http://elasticsearch:9200/rgw-primary-mybucket/_doc/myobject.txt" \
  -H "Content-Type: application/json" \
  -d "${OBJECT_META}"

# Recreate a deleted index
curl -X PUT "http://elasticsearch:9200/rgw-primary-newbucket" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {"number_of_shards": 4, "number_of_replicas": 1},
    "mappings": {"properties": {"name": {"type": "keyword"}, "lastmodified": {"type": "date"}}}
  }'
```

## Step 6 - Reset and Resync a Full Zone

When sync is deeply broken, a full resync may be needed:

```bash
# Reinitialize the data sync state for a zone (use with caution)
radosgw-admin data sync init \
  --source-zone=primary-zone

# Force a full resync
radosgw-admin data sync run \
  --source-zone=primary-zone

# Monitor resync progress
watch -n 10 "radosgw-admin sync status 2>&1 | grep -E 'full sync|behind|caught up'"

# After full sync completes, trim old error entries
radosgw-admin sync error trim \
  --start-date=$(date -d '30 days ago' +%Y-%m-%d) \
  --end-date=$(date -d '1 hour ago' +%Y-%m-%d)
```

## Summary

Troubleshooting Ceph RGW sync module failures starts with reading the error log for specific failure codes, then testing connectivity to the sync target and validating credentials. Per-object retry with `radosgw-admin bucket sync run` resolves transient failures, while resetting the sync state is reserved for severe cases. Enabling verbose debug logging during investigation provides the detailed context needed to diagnose intermittent or complex failures.
