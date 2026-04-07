# How to Use MinIO Client (mc) with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MinIO, mc, S3, RGW, Storage

Description: Use the MinIO Client (mc) command-line tool with Ceph RGW's S3-compatible API for bucket management, data transfers, mirroring, and admin operations.

---

## Overview

The MinIO Client (`mc`) is a fast, feature-rich CLI tool for S3-compatible object storage. It supports Ceph RGW natively by registering it as a custom alias. `mc` provides additional capabilities like real-time event watching, mirroring, and admin operations compared to the AWS CLI.

## Install mc

```bash
# Linux
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# macOS
brew install minio/stable/mc
```

## Register Ceph RGW as an mc Alias

```bash
mc alias set ceph \
  http://rook-ceph-rgw-my-store.rook-ceph:80 \
  myaccesskey \
  mysecretkey \
  --api S3v4
```

Verify the connection:

```bash
mc ls ceph
```

## Bucket Operations

Create a bucket:

```bash
mc mb ceph/my-bucket
```

List buckets:

```bash
mc ls ceph
```

Remove an empty bucket:

```bash
mc rb ceph/my-bucket
```

Remove a bucket and all its contents:

```bash
mc rb ceph/my-bucket --force
```

## File Operations

Upload a file:

```bash
mc cp /tmp/report.pdf ceph/my-bucket/reports/report.pdf
```

Download a file:

```bash
mc cp ceph/my-bucket/reports/report.pdf /tmp/
```

Upload a directory recursively:

```bash
mc cp --recursive /var/data/ ceph/my-bucket/data/
```

## Mirror Data

Continuously mirror a local directory to Ceph:

```bash
mc mirror /var/backups/ ceph/my-bucket/backups/ \
  --watch \
  --remove
```

## Watch for Events

Watch a bucket for object creation events in real time:

```bash
mc watch ceph/my-bucket
```

## Manage Bucket Policies

Set a public read policy:

```bash
mc anonymous set download ceph/my-bucket/public/
```

Get current policy:

```bash
mc anonymous get ceph/my-bucket
```

## Summary

`mc` provides a powerful alternative to the AWS CLI for managing Ceph RGW object storage, with extras like live mirroring and bucket event watching. After registering Ceph as an alias, all standard S3 operations work immediately with a clean, intuitive command syntax.
