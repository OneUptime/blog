# Validation Summary: How to Configure Ceph RGW as Backend for Duplicati

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW / RADOS Gateway)
- Duplicati (backup tool with S3 backend support)
- S3-compatible object storage
- radosgw-admin CLI
- AWS CLI (for bucket creation)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- [Duplicati CLI Documentation](https://docs.duplicati.com/duplicati-programs/command-line-interface-cli) -- verified CLI commands and subcommand names
- [Duplicati S3-compatible Destination Docs](https://docs.duplicati.com/backup-destinations/standard-based-destinations/s3-compatible-destination) -- verified S3 backend URL format and query parameters
- [Ceph Admin Guide - User Management](https://docs.ceph.com/en/latest/radosgw/admin/) -- verified `radosgw-admin user create` syntax and output format
- [radosgw-admin manpage](https://docs.ceph.com/en/latest/man/8/radosgw-admin/) -- verified `bucket stats` subcommand
- [Rook Ceph Toolbox](https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/) -- verified `kubectl exec deploy/rook-ceph-tools` pattern
- [Rook Object Storage Docs](https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/) -- verified RGW service endpoint naming convention

## Issues Found
1. **Invalid Duplicati CLI command `list-backups`** (Step 6, line 87): `duplicati-cli list-backups` is not a valid Duplicati CLI subcommand. The correct command to list backup versions/filesets is `duplicati-cli find` (when invoked without a filename argument, it lists all known backup versions). Changed `list-backups` to `find`.

## Review Notes
- The `aws s3 mb` command in Step 1 assumes the user has already configured AWS CLI credentials (via environment variables or `aws configure`) with the access key and secret key from the previous command. This is implied but not explicitly shown. Experienced users would know to do this.
- The S3 backend URL in Step 3 includes empty parameters `s3-location-constraint=` and `s3-storage-class=` which are harmless but unnecessary -- they could be omitted for cleanliness.
- The `radosgw-admin user create` output nests `access_key` and `secret_key` inside a `keys` array in the JSON response, not as top-level fields. The post's instruction to "note the access_key and secret_key" is correct in substance but slightly imprecise about the output structure.
- Port 7480 used in the Duplicati configuration is the default standalone Ceph RGW port, while Rook typically exposes RGW on port 80. The post uses an `example.com` domain suggesting an external endpoint, so this is acceptable.
