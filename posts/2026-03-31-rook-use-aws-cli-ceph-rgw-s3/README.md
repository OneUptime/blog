# How to Use AWS CLI with Ceph RGW S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, AWS CLI, S3, RGW, Storage, DevOps

Description: Learn how to configure and use the AWS CLI to interact with Ceph RGW's S3-compatible API for bucket management, file uploads, and object operations.

---

## Overview

Ceph RADOS Gateway (RGW) exposes an S3-compatible HTTP API. The AWS CLI works with Ceph RGW by pointing it at the RGW endpoint instead of AWS. This lets teams use familiar AWS tooling against their on-premises Ceph cluster.

## Prerequisites

- AWS CLI v2 installed
- Ceph RGW running (via Rook or standalone)
- RGW user credentials (access key and secret key)

## Create an RGW User

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=awscli-user \
  --display-name="AWS CLI User" \
  --access-key=myaccesskey \
  --secret-key=mysecretkey
```

## Configure AWS CLI Profile

Set up a named profile pointing to Ceph RGW:

```bash
aws configure --profile ceph
# AWS Access Key ID: myaccesskey
# AWS Secret Access Key: mysecretkey
# Default region name: us-east-1
# Default output format: json
```

## Basic S3 Operations

Create a bucket:

```bash
aws s3 mb s3://my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Upload a file:

```bash
aws s3 cp /tmp/myfile.txt s3://my-bucket/myfile.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

List bucket contents:

```bash
aws s3 ls s3://my-bucket/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Download a file:

```bash
aws s3 cp s3://my-bucket/myfile.txt /tmp/downloaded.txt \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Sync a Local Directory

```bash
aws s3 sync /var/backups/ s3://my-bucket/backups/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph \
  --delete
```

## Using the `s3api` Subcommand

Get bucket ACL:

```bash
aws s3api get-bucket-acl \
  --bucket my-bucket \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

Put an object with metadata:

```bash
aws s3api put-object \
  --bucket my-bucket \
  --key config/app.yaml \
  --body /tmp/app.yaml \
  --metadata env=production,version=1.0 \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --profile ceph
```

## Environment Variable Shortcut

Instead of always passing `--endpoint-url`, export the built-in `AWS_ENDPOINT_URL` environment variable supported by AWS CLI v2:

```bash
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=myaccesskey
export AWS_SECRET_ACCESS_KEY=mysecretkey
export AWS_ENDPOINT_URL=http://rook-ceph-rgw-my-store.rook-ceph:80

aws s3 ls
```

## Summary

The AWS CLI integrates seamlessly with Ceph RGW by using the `--endpoint-url` flag or an environment variable. All standard S3 operations including bucket management, file transfers, and metadata manipulation work against Ceph with no code changes required.
