# Validation Summary: How to Enable Bucket Versioning in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway)
- AWS CLI (S3-compatible API commands)
- S3 Bucket Versioning
- S3 Lifecycle Configuration
- kubectl / radosgw-admin CLI
- jq (JSON processing)

## Sources Consulted
- AWS CLI `s3api list-object-versions` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `s3api put-bucket-versioning` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- AWS CLI `s3api get-object` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- AWS CLI `s3api delete-object` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html
- AWS CLI `s3api put-bucket-lifecycle-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Ceph RGW S3 bucket versioning documentation: https://docs.ceph.com/en/latest/radosgw/s3/bucketops/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found
1. **Incorrect CLI flag `--key` in `list-object-versions` command**: The `aws s3api list-object-versions` command does not accept a `--key` parameter. The correct parameter to filter results by object key is `--prefix`. Changed `--key file.txt` to `--prefix file.txt` in the "Upload Multiple Versions" section.

## Review Notes
- The `--prefix` filter used as a replacement for `--key` performs prefix matching, not exact key matching. For the example key `file.txt`, this is unlikely to cause issues, but in production with keys that share prefixes (e.g., `file.txt` and `file.txt.bak`), additional client-side filtering may be needed.
- The explanation that versioning can be "suspended (not disabled)" is correct and an important nuance - once enabled, S3 bucket versioning cannot be fully turned off.
- All other AWS CLI commands (`put-bucket-versioning`, `get-bucket-versioning`, `get-object`, `delete-object`, `s3 cp`, `s3 rm`, `put-bucket-lifecycle-configuration`) use correct syntax and flags.
- The lifecycle configuration JSON structure is valid and uses correct field names (`NoncurrentVersionExpiration`, `NoncurrentDays`, `AbortIncompleteMultipartUpload`, `DaysAfterInitiation`).
- The `radosgw-admin bucket stats` command and jq filter for extracting `rgw.main` usage stats are correct.
