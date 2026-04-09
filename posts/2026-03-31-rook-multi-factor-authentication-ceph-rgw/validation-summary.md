# Validation Summary: How to Set Up Multi-Factor Authentication for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- TOTP (Time-based One-Time Password) / MFA
- AWS CLI (s3api)
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation — RGW MFA: https://docs.ceph.com/en/latest/radosgw/mfa/
- Ceph Reef documentation — RGW MFA: https://docs.ceph.com/en/reef/radosgw/mfa/
- AWS CLI reference — put-bucket-versioning: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- AWS CLI reference — delete-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html
- Ceph configuration reference for default RGW port (beast port=7480)

## Issues Found
1. **`radosgw-admin mfa resync` required two PINs, not one.** The original post showed a single `--totp-pin` flag for the resync command. Per the official Ceph documentation, `mfa resync` requires two consecutive TOTP PINs (the previous pin and the current pin) so RGW can calculate the time offset. Fixed by adding a second `--totp-pin` argument and an explanatory note.

## Review Notes
- All other `radosgw-admin mfa` subcommands (`create`, `list`, `check`, `remove`) use correct flags and syntax.
- The `--mfa` flag format for AWS CLI commands ("serial-number otp-code") is correct.
- The default RGW port 7480 (beast frontend) is accurate.
- The `--versioning-configuration Status=Enabled,MFADelete=Enabled` shorthand syntax is correct for the AWS CLI.
- The post correctly states that RGW MFA Delete follows the AWS S3 MFA Delete specification.
