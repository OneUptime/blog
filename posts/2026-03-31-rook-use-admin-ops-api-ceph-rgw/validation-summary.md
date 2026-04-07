# Validation Summary: How to Use the Admin Ops API with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RGW Admin Ops REST API
- radosgw-admin CLI
- AWS Signature V4 authentication
- curl with --aws-sigv4
- Python (botocore SigV4Auth, requests)

## Sources Consulted
- Ceph official documentation: Admin Ops API (https://docs.ceph.com/en/latest/radosgw/adminops/)
- Ceph official documentation: radosgw-admin CLI (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- curl manual: --aws-sigv4 option (https://curl.se/docs/manpage.html)
- botocore documentation: SigV4Auth, AWSRequest, Credentials classes

## Issues Found
1. **Unused `import boto3` in Python example**: The Python code imported `boto3` but never used it. Only `botocore` submodules (`SigV4Auth`, `AWSRequest`, `Credentials`) and `requests` are actually used. Removed the unused import.

## Review Notes
- All curl commands use correct `--aws-sigv4 "aws:amz:us-east-1:s3"` syntax (requires curl 7.75.0+), which is not mentioned but is a minor consideration for users on older systems.
- The Admin Ops API endpoints (`/admin/user`, `/admin/bucket`, `/admin/user?quota`) and their HTTP methods (GET, PUT, DELETE) are accurate per the Ceph documentation.
- The `radosgw-admin user create` command with `--system`, `--access-key`, and `--secret` flags is correct.
- The Python SigV4 signing approach using botocore internals is a well-known pattern and works correctly for signing requests to S3-compatible APIs.
- The quota JSON body fields (`max_size_kb`, `max_objects`, `enabled`) are correct per the Admin Ops API specification.
