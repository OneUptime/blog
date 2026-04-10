# How to Use the Ceph RGW Admin Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Administration, radosgw-admin, Object Storage

Description: Learn the essential radosgw-admin commands for managing Ceph RGW, covering users, buckets, quotas, and operational tasks for day-to-day administration.

---

## Overview

The `radosgw-admin` CLI is the primary tool for administering Ceph RADOS Gateway. It provides commands to manage users, buckets, objects, quotas, and the multisite topology. This guide covers the most commonly used administrative operations.

## User Management

```bash
# Create a user
radosgw-admin user create \
  --uid=alice \
  --display-name="Alice Smith" \
  --email=alice@example.com

# Get user info
radosgw-admin user info --uid=alice

# Modify user
radosgw-admin user modify --uid=alice --max-buckets=100

# Disable a user
radosgw-admin user suspend --uid=alice

# Enable a user
radosgw-admin user enable --uid=alice

# Delete a user
radosgw-admin user rm --uid=alice
```

## Access Key Management

```bash
# Create additional access keys for a user
radosgw-admin key create \
  --uid=alice \
  --key-type=s3 \
  --gen-access-key \
  --gen-secret

# Remove an access key
radosgw-admin key rm \
  --uid=alice \
  --key-type=s3 \
  --access-key=AKIEXAMPLE123
```

## Bucket Management

```bash
# List all buckets
radosgw-admin bucket list

# List buckets for a user
radosgw-admin bucket list --uid=alice

# Get bucket info
radosgw-admin bucket stats --bucket=mybucket

# Link a bucket to a user (get bucket-id from bucket stats output)
radosgw-admin bucket link --bucket=mybucket --bucket-id=<bucket-id> --uid=alice

# Remove a bucket (and all objects)
radosgw-admin bucket rm --bucket=mybucket --purge-objects
```

## Quota Management

```bash
# Set user-level quota
radosgw-admin quota set \
  --uid=alice \
  --quota-scope=user \
  --max-size=10G \
  --max-objects=100000

# Enable user quota
radosgw-admin quota enable --uid=alice --quota-scope=user

# Set bucket-level quota
radosgw-admin quota set \
  --uid=alice \
  --quota-scope=bucket \
  --max-size=5G

# Check quota usage
radosgw-admin user stats --uid=alice
```

## Object Operations

```bash
# List objects in a bucket
radosgw-admin bucket list --bucket=mybucket

# Get object info
radosgw-admin object stat --bucket=mybucket --object=file.txt

# Remove a specific object
radosgw-admin object rm --bucket=mybucket --object=file.txt
```

## Garbage Collection

```bash
# List pending GC items
radosgw-admin gc list --include-all

# Process garbage collection immediately
radosgw-admin gc process
```

## Rook: Using radosgw-admin via Toolbox

In Rook, run admin commands from the toolbox:

```bash
TOOLBOX=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools \
  -o jsonpath='{.items[0].metadata.name}')

# Create a user
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin user create \
    --uid=alice \
    --display-name="Alice Smith"

# Check bucket stats
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  radosgw-admin bucket stats --bucket=mybucket
```

## Summary

`radosgw-admin` covers the full lifecycle of Ceph RGW administration including user management, bucket operations, quota enforcement, and garbage collection. In Rook environments, use the toolbox pod to run these commands. Regular tasks include monitoring user stats, processing GC, and reviewing bucket statistics to maintain a healthy object storage cluster.
