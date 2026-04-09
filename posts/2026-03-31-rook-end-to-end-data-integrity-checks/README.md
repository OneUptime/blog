# How to Implement End-to-End Data Integrity Checks with Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Data Integrity, Checksum, Monitoring

Description: Learn how to implement end-to-end data integrity checks in Ceph by combining application-level checksums, BlueStore verification, and scrubbing pipelines.

---

True end-to-end data integrity means verifying that data written by an application matches what is read back, even after passing through multiple storage layers. Ceph provides per-layer integrity tools, but you must combine them intentionally to achieve full coverage.

## The Integrity Stack

A complete integrity stack for Ceph-backed workloads looks like this:

```text
Application Layer    -> Application-level checksums (e.g., SHA-256 metadata)
Network Layer        -> TLS encryption in transit (RBD, CephFS, RGW)
Ceph Client Layer    -> RADOS write verification (client reads back and verifies)
BlueStore Layer      -> Per-block checksums (crc32c)
OSD Layer            -> Scrubbing (light + deep)
Hardware Layer       -> Disk SMART monitoring
```

## Step 1 - Application-Level Checksum

In your application, compute a hash before writing and store it alongside the object:

```python
import hashlib
import boto3

def upload_with_checksum(bucket, key, data):
    checksum = hashlib.sha256(data).hexdigest()
    s3 = boto3.client('s3', endpoint_url='http://ceph-rgw:80')
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        Metadata={'sha256': checksum}
    )
    return checksum

def verify_object(bucket, key, expected_checksum):
    s3 = boto3.client('s3', endpoint_url='http://ceph-rgw:80')
    response = s3.get_object(Bucket=bucket, Key=key)
    data = response['Body'].read()
    actual = hashlib.sha256(data).hexdigest()
    return actual == expected_checksum
```

## Step 2 - BlueStore Checksum Verification

Ensure BlueStore checksums are enabled:

```bash
ceph config get osd bluestore_csum_type
# Should return: crc32c
```

Enable if not set:

```bash
ceph config set osd bluestore_csum_type crc32c
```

## Step 3 - RADOS Write Verification

Use the RADOS API to verify writes immediately after completion:

```bash
# Write then immediately read back and compare
rados put testobj /tmp/testfile -p mypool
rados get testobj /tmp/verify -p mypool
diff /tmp/testfile /tmp/verify && echo "Write verified" || echo "MISMATCH DETECTED"
```

## Step 4 - Scheduled Deep Scrubbing

Configure aggressive scrub schedules for critical data:

```bash
ceph osd pool set critical-data deep_scrub_interval 259200
ceph osd pool set critical-data scrub_min_interval 43200
```

## Step 5 - Disk SMART Monitoring

```bash
#!/bin/bash
for dev in /dev/sd*; do
  SMART_STATUS=$(smartctl -H $dev | grep "overall-health")
  if [[ $SMART_STATUS != *"PASSED"* ]]; then
    echo "WARNING: $dev health check failed: $SMART_STATUS"
  fi
done
```

## Prometheus End-to-End Alerts

Combine metrics into an integrated alert:

```yaml
groups:
- name: e2e-integrity
  rules:
  - alert: StorageIntegrityViolation
    expr: >
      ceph_pg_inconsistent > 0 or
      ceph_pg_degraded > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Data integrity violation detected in Ceph"
```

## Summary

End-to-end data integrity in Ceph requires combining application-level checksums, BlueStore block-level verification, RADOS write confirmation, regular deep scrubbing, and hardware monitoring. Each layer catches different classes of failure. Together they form a complete defense against silent data corruption from application code all the way down to physical storage media.
