# Validation Summary: How to Configure STS (Security Token Service) for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- AWS Security Token Service (STS) API
- radosgw-admin CLI
- AWS CLI
- IAM roles and policies in Ceph
- TOTP MFA with Ceph RGW

## Sources Consulted
- Ceph official documentation on STS: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph official documentation on role management: https://docs.ceph.com/en/latest/radosgw/role/
- Ceph configuration reference for RGW STS options (`rgw_sts_key`, `rgw_s3_auth_use_sts`)
- AWS CLI reference for `sts assume-role` and `sts get-session-token`
- Ceph documentation on MFA with RGW: https://docs.ceph.com/en/latest/radosgw/mfa/

## Issues Found
1. **`rgw_sts_key` placeholder was wrong length**: The placeholder value `"your-32-char-secret-key-here!!"` was only 30 characters. The `rgw_sts_key` is used for AES encryption of session tokens and should be exactly 16 or 32 characters. Changed to `"your-32-char-secret-key-here!!!!"` (32 characters) so readers who copy the placeholder structure get a valid-length key.

## Review Notes
- The post correctly identifies Pacific (16.x) as the version with full STS support. STS was partially available in earlier releases but Pacific solidified the implementation.
- The `GetSessionToken` MFA example uses `--serial-number 1234567890` which is valid for Ceph RGW's TOTP serial format (set via `radosgw-admin mfa create`), but the post does not mention that TOTP MFA must first be configured for the user. This is not an error but could be expanded in a future revision.
- The `radosgw-admin role create` and `role-policy put` commands use correct syntax and flag names.
- The AssumeRole response JSON structure shown is accurate for the Credentials block.
- Port 7480 is the correct default RGW port for the Beast frontend.
