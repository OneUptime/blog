# How to Configure Ceph RGW as Backend for Duplicati

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Duplicati, Backup, S3, Object Storage, Encryption

Description: Configure Ceph RGW as an S3-compatible storage backend for Duplicati, enabling encrypted incremental backups stored in your self-hosted Ceph object store.

---

## Overview

Duplicati is a free backup tool with a web-based UI that supports S3-compatible storage backends. Ceph RGW provides the S3 API required, making it straightforward to point Duplicati at your own Ceph cluster instead of commercial cloud storage.

## Prerequisites

- Rook-Ceph cluster with RGW service deployed
- Duplicati installed (available at duplicati.com)
- RGW endpoint accessible from the Duplicati host

## Step 1 - Create RGW User and Bucket

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=duplicati \
  --display-name="Duplicati Backup User"
```

Note the `access_key` and `secret_key` from the output. Then create a bucket using the S3 API:

```bash
aws s3 mb s3://duplicati-backups \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

## Step 2 - Configure Duplicati via Web UI

In the Duplicati web interface, create a new backup job:

1. Navigate to "Add backup"
2. For storage type, select "S3 Compatible"
3. Fill in the server settings:

```yaml
Server: Custom server URL
Server URL: http://ceph-rgw.example.com:7480
Bucket name: duplicati-backups
AWS Access ID: YOUR_ACCESS_KEY
AWS Access Key: YOUR_SECRET_KEY
```

For the bucket path, use a subfolder to keep backups organized:

```text
Bucket path: /my-server/
```

## Step 3 - Configure via Command Line

Alternatively, use the Duplicati CLI:

```bash
duplicati-cli backup \
  "s3://duplicati-backups/my-server/?s3-server-name=ceph-rgw.example.com:7480&s3-location-constraint=&s3-storage-class=&s3-client=aws&aws-access-key-id=YOUR_KEY&aws-secret-access-key=YOUR_SECRET&use-ssl=false" \
  /home /etc \
  --passphrase="your-backup-passphrase" \
  --backup-name="MyServer Daily"
```

## Step 4 - Test the Connection

In the Duplicati UI, use the "Test connection" button before saving. If you see SSL errors, ensure you set `use-ssl=false` for HTTP endpoints.

## Step 5 - Schedule Automated Backups

In Duplicati UI:

1. Go to the backup settings
2. Set schedule: "Run automatically every: 1 Day"
3. Set retention: keep 1 year of backups
4. Enable email notification on failure

## Step 6 - Monitor Backup Status

```bash
duplicati-cli find \
  "s3://duplicati-backups/my-server/?s3-server-name=ceph-rgw.example.com:7480&aws-access-key-id=KEY&aws-secret-access-key=SECRET"
```

Check object storage usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats --bucket=duplicati-backups
```

## Step 7 - Restore Files

In Duplicati UI, navigate to "Restore" and select the backup job. Browse the file tree to select specific files or restore the entire backup to a target directory.

## Summary

Duplicati integrates cleanly with Ceph RGW using its built-in S3-compatible storage backend. The setup requires only your RGW endpoint URL, bucket name, and access credentials. This configuration stores encrypted, deduplicated backups in your own infrastructure, eliminating dependency on commercial cloud backup services.
