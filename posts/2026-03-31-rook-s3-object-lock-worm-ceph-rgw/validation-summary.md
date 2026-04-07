# Validation Summary: How to Configure S3 Object Lock (WORM) in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS CLI (S3 API)
- S3 Object Lock (WORM)
- S3 Legal Hold

## Sources Consulted
- AWS CLI S3API reference for `create-bucket`, `put-object-lock-configuration`, `put-object`, `delete-object`, `put-object-legal-hold`, `get-object-retention`: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- Ceph RGW S3 Object Lock documentation: https://docs.ceph.com/en/latest/radosgw/s3/objectlocking/
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html

## Issues Found
No technical issues found.

## Review Notes
- The `--object-lock-enabled-for-bucket` flag on `create-bucket` is correct and required at bucket creation time for Ceph RGW.
- Versioning being automatically enabled with Object Lock is accurately stated.
- The `put-object-lock-configuration` JSON structure (`ObjectLockEnabled`, `Rule.DefaultRetention.Mode`, `Rule.DefaultRetention.Days`) is correct per the S3 API specification.
- The `--bypass-governance-retention` flag for `delete-object` correctly requires `s3:BypassGovernanceRetention` permission (mentioned as "special permission" in the post).
- The `--legal-hold` JSON with `{"Status": "ON"}` is the correct format.
- Note: AWS S3 added support for enabling Object Lock on existing buckets (2023), but Ceph RGW still generally requires it at bucket creation time, so the post's guidance is correct for the Ceph/Rook context.
