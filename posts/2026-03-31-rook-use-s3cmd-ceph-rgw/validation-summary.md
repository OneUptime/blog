# Validation Summary: How to Use s3cmd with Ceph RGW

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- s3cmd (S3 command-line client)
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3-compatible object storage API

## Sources Consulted
- s3cmd official documentation and man page (https://s3tools.org/usage)
- s3cmd GitHub repository (https://github.com/s3tools/s3cmd)
- Ceph RGW S3 compatibility documentation (https://docs.ceph.com/en/latest/radosgw/s3/)
- Rook Ceph Object Store documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)

## Issues Found
No technical issues found.

## Review Notes
- The configuration correctly uses path-style addressing by setting `host_bucket` to the same value as `host_base` (no `%(bucket)s` subdomain pattern), which is the standard approach for Ceph RGW endpoints that do not support virtual-hosted-style bucket addressing.
- `signature_v2 = False` correctly defaults to AWS Signature V4, which is recommended for modern Ceph RGW deployments.
- All s3cmd subcommands and flags (`mb`, `put`, `get`, `ls`, `del`, `sync`, `setacl`, `info`, `du`, `--delete-removed`, `--progress`, `--acl-public`, `--acl-private`, `--multipart-chunk-size-mb`) are verified as correct.
- The EPEL note for RHEL/CentOS is accurate — s3cmd is available via EPEL, and `dnf` is the correct package manager for RHEL 8+/CentOS Stream.
