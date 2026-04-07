# Validation Summary: How to Set Up Server-Side Encryption with Customer Keys (SSE-C) for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- SSE-C (Server-Side Encryption with Customer-Provided Keys)
- AWS CLI (`s3 cp`, `s3api copy-object`)
- Python boto3
- OpenSSL

## Sources Consulted
- AWS CLI `s3 cp` SSE-C documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `s3api copy-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- boto3 `put_object` / `get_object` SSECustomerKey documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object.html
- Ceph RGW encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- AWS S3 SSE-C specification: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html

## Issues Found

1. **boto3 SSECustomerKey double-encoding bug**: The Python example passed `key_b64` (the base64-encoded key string) to `SSECustomerKey`. boto3 internally base64-encodes whatever value is provided before sending it in the HTTP header, so passing an already-encoded string results in double-encoding and a failed request. Fixed by changing `SSECustomerKey=key_b64` to `SSECustomerKey=key_bytes` (raw bytes) in both `put_object` and `get_object` calls.

2. **Wrong parameter names for `aws s3api copy-object`**: The key rotation example used `--sse-c`, `--sse-c-key`, `--copy-source-sse-c`, and `--copy-source-sse-c-key` — these are shorthand flags available only in `aws s3` high-level commands (like `s3 cp`), not in `aws s3api` commands. Fixed to use the correct long-form parameters: `--sse-customer-algorithm`, `--sse-customer-key`, `--copy-source-sse-customer-algorithm`, and `--copy-source-sse-customer-key`.

## Review Notes
- The `KEY_MD5` variable is generated in the key generation step but never used in any subsequent command. The AWS CLI computes the MD5 automatically, so it is not needed. This is not incorrect but could confuse readers.
- The error message shown for a wrong-key download ("AccessDenied") is a reasonable simplification; the actual HTTP status is 403 Forbidden and the exact error wording may vary across Ceph versions.
- The explanation that SSE-C requires HTTPS is correct and important — Ceph RGW will reject SSE-C requests over plain HTTP by default.
