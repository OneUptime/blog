# Validation Summary: How to Configure Temporary Credentials with STS Lite in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph STS (Security Token Service) Lite
- Rook (Ceph operator for Kubernetes)
- AWS CLI (STS commands)
- Python boto3 (STS and S3 clients)
- Kubernetes (kubectl for RGW management)

## Sources Consulted
- Ceph official documentation on STS: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- AWS boto3 STS documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts.html
- Ceph source code for STS token handling (rgw_sts.cc)

## Issues Found

1. **Incorrect claim about RADOS token storage (Overview section)**: The post stated "STS Lite uses a token stored in RADOS to track sessions." This is incorrect — STS session tokens in Ceph RGW are self-contained encrypted blobs (encrypted with `rgw_sts_key`) that embed the temporary credentials and expiration. They are not stored in RADOS. Fixed to accurately describe the token as a self-contained encrypted blob.

2. **Invalid monitoring command (Step 6)**: The command `rados -p default.rgw.otp ls | grep sts` was presented as a way to list active STS sessions. The `default.rgw.otp` pool is used for MFA TOTP tokens, not STS sessions. Since STS tokens are self-contained and not persisted in RADOS, there is no RADOS pool to query for active sessions. Replaced with RGW log inspection and configuration verification commands.

## Review Notes
- The `rgw_sts_key` comment about "exactly 32 characters for AES-256" is a simplification. The key length determines the AES variant (16 bytes = AES-128, 32 bytes = AES-256). The example key provided is exactly 32 characters, which is correct for AES-256.
- The Python credential refresh class in Step 5 uses `dateutil.parser` for string date parsing, which is a third-party dependency (`python-dateutil`). In practice, boto3 typically returns `Expiration` as a `datetime` object, so the string check is a reasonable defensive measure but may rarely be needed.
- The grep pattern in Step 6 was updated from `sts_lite` to `sts` since RGW logs typically reference "sts" or "STS" rather than "sts_lite" as a specific string.
