# Validation Summary: How to Use STS Lite with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- STS (Security Token Service) Lite
- AWS CLI (for STS calls)
- Python boto3
- MFA/TOTP with Ceph RGW

## Sources Consulted
- Ceph official documentation on STS: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph official documentation on STS Lite: https://docs.ceph.com/en/latest/radosgw/STSLite/
- AWS STS API reference for GetSessionToken: https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html
- AWS S3 error codes documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html
- boto3 STS client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts.html

## Issues Found
1. **Incorrect error code for expired tokens (line 109)**: The post used `ExpiredTokenException` as the error code for expired temporary credentials. The correct S3-compatible error code (which Ceph RGW implements) is `ExpiredToken`. Changed `'ExpiredTokenException'` to `'ExpiredToken'`.

## Review Notes
- The `rgw_sts_key` placeholder value "your-32-char-secret-key-here!!" is actually 30 characters, not 32. The key must be exactly 16 or 32 characters for AES encryption. Since this is clearly a placeholder, it was not changed, but users should be aware they need an exact 16- or 32-character key.
- The STS Lite vs Full STS comparison table is accurate and helpful.
- The boto3 code examples are syntactically correct and use proper API calls.
- The MFA serial number ARN format shown follows AWS conventions; Ceph RGW accepts this format for STS MFA operations.
- The default duration (3600s) and max duration (43200s / 12 hours) values are correct per Ceph documentation.
