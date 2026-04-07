# How to Troubleshoot Ceph RGW Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Debugging, Object Storage, Operation

Description: Diagnose and fix common Ceph RGW issues including slow requests, authentication failures, bucket errors, and connectivity problems.

---

Ceph RGW issues range from authentication errors and slow responses to bucket index corruption. This guide walks through systematic troubleshooting approaches using logs, health checks, and diagnostic commands.

## Checking Overall Cluster and RGW Health

Start with the big picture:

```bash
# Cluster health
ceph health detail

# Check RGW daemon status
ceph orch ps --daemon-type rgw

# Check RGW service
ceph orch ls --service-type rgw
```

In Rook:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw
kubectl describe pod -n rook-ceph rook-ceph-rgw-my-store-a-xxxx
```

## Enabling Debug Logging

Temporarily increase RGW log verbosity to diagnose issues:

```bash
ceph config set client.rgw debug_rgw 20
ceph config set client.rgw debug_ms 1
```

Then tail the RGW log:

```bash
# Baremetal
journalctl -u ceph-radosgw@rgw.$(hostname -s) -f

# Rook
kubectl logs -n rook-ceph -l app=rook-ceph-rgw -f --tail=200
```

Reset log levels after debugging:

```bash
ceph config rm client.rgw debug_rgw
ceph config rm client.rgw debug_ms
```

## Diagnosing Authentication Errors

Common auth error codes:
- `AccessDenied`: Wrong credentials or missing permissions
- `InvalidAccessKeyId`: Access key does not exist
- `SignatureDoesNotMatch`: Secret key mismatch or clock skew

Check if a user exists:

```bash
radosgw-admin user info --uid myuser
```

Verify access key:

```bash
radosgw-admin user info --access-key AKIAIOSFODNN7EXAMPLE
```

Check for clock skew (must be within 15 minutes):

```bash
date -u
# Compare with client clock
```

## Diagnosing Slow Requests

Find slow ops in the RGW log:

```bash
grep "slow request" /var/log/ceph/ceph-client.rgw*.log | tail -20
```

Check RADOS op latency:

```bash
ceph osd pool stats default.rgw.buckets.data
```

Profile operations with the admin socket:

```bash
ceph daemon client.rgw.$(hostname -s) perf dump | grep -E "req|latency"
```

## Fixing Bucket Index Inconsistencies

If listing a bucket returns errors or wrong counts:

```bash
# Check and report inconsistencies
radosgw-admin bucket check --bucket mybucket

# Fix found inconsistencies
radosgw-admin bucket check --bucket mybucket --fix

# Rebuild the index from scratch
radosgw-admin bi rebuild --bucket mybucket
```

## Resolving 404 Errors for Existing Objects

If objects exist in RADOS but return 404:

```bash
# Check bucket stats and marker
radosgw-admin bucket stats --bucket mybucket

# Check index against actual objects in RADOS
radosgw-admin bucket check --bucket mybucket --check-objects

# Fix missing index entries
radosgw-admin bucket check --bucket mybucket --check-objects --fix
```

## Summary

Systematic RGW troubleshooting starts with cluster and daemon health, then uses debug logging to capture detailed errors. Authentication issues are usually credential or clock related, slow requests require latency profiling, and bucket errors often need index checks or rebuilds. Always restore log levels to defaults after debugging to avoid performance impact.
