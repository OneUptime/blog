# How to Use s3cmd with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, s3cmd, S3, RGW, Storage, DevOps

Description: Configure and use s3cmd to manage buckets and objects on Ceph RGW's S3-compatible API, including transfers, ACLs, and sync operations.

---

## Overview

`s3cmd` is a command-line tool for S3-compatible object storage. It works with Ceph RGW through custom endpoint configuration, making it a popular choice for scripting and admin tasks on Ceph clusters.

## Install s3cmd

```bash
# On Debian/Ubuntu
apt-get install s3cmd

# On RHEL/CentOS (from the EPEL RPM repository)
dnf install s3cmd

# Via pip
pip install s3cmd
```

## Configure s3cmd for Ceph RGW

Run the interactive configuration:

```bash
s3cmd --configure
```

Or create the config file directly at `~/.s3cfg`. For the common path-style setup against a Rook RGW service, point both `host_base` and `host_bucket` at the RGW endpoint:

```ini
[default]
access_key = myaccesskey
secret_key = mysecretkey
host_base = rook-ceph-rgw-my-store.rook-ceph:80
host_bucket = rook-ceph-rgw-my-store.rook-ceph:80
use_https = False
signature_v2 = False
```

## Basic Operations

Create a bucket:

```bash
s3cmd mb s3://my-bucket
```

Upload a file:

```bash
s3cmd put /tmp/report.pdf s3://my-bucket/reports/report.pdf
```

List objects:

```bash
s3cmd ls s3://my-bucket/
```

Download a file:

```bash
s3cmd get s3://my-bucket/reports/report.pdf /tmp/report-downloaded.pdf
```

Delete an object:

```bash
s3cmd del s3://my-bucket/reports/report.pdf
```

## Sync Local Directory to Ceph

```bash
s3cmd sync /var/data/ s3://my-bucket/data/ \
  --delete-removed \
  --progress
```

## Set Object ACL

Make an object publicly readable:

```bash
s3cmd setacl s3://my-bucket/public-file.txt --acl-public
```

Restrict to owner only:

```bash
s3cmd setacl s3://my-bucket/private-file.txt --acl-private
```

## Get Bucket and Object Info

```bash
s3cmd info s3://my-bucket
s3cmd info s3://my-bucket/reports/report.pdf
```

## Multipart Upload for Large Files

```bash
s3cmd put /var/data/large-backup.tar.gz s3://my-bucket/backups/ \
  --multipart-chunk-size-mb=100
```

## Disk Usage

```bash
s3cmd du s3://my-bucket
s3cmd du s3://my-bucket/reports/
```

## Summary

`s3cmd` is a versatile CLI tool that works with Ceph RGW by pointing `host_base` and `host_bucket` at the RGW endpoint. It supports common S3 operations and is well-suited for shell scripts that need to interact with Ceph object storage.
