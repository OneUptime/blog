# How to Set Up Multi-Factor Authentication for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Authentication, MFA, Object Storage

Description: Configure multi-factor authentication (MFA) for Ceph RGW to require TOTP tokens when deleting objects or bucket versioning configurations.

---

Ceph RGW supports multi-factor authentication (MFA) delete, which follows the AWS S3 MFA Delete specification. When enabled, certain destructive operations - like permanently deleting versioned objects or disabling versioning - require a valid TOTP token in addition to the standard credentials.

## Prerequisites

MFA in RGW is TOTP-based. You need a TOTP authenticator app (Google Authenticator, Authy, etc.) and the `radosgw-admin` tool.

## Creating an MFA TOTP Token for a User

Generate a TOTP token and associate it with an RGW user:

```bash
# Generate a TOTP seed
radosgw-admin mfa create \
  --uid myuser \
  --totp-serial 1234567890 \
  --totp-seed JBSWY3DPEHPK3PXP \
  --totp-seed-type base32 \
  --totp-seconds 30 \
  --totp-window 2
```

Parameters:
- `--totp-serial`: Unique serial number for this token
- `--totp-seed`: The shared TOTP secret (base32 encoded)
- `--totp-seconds`: TOTP time step (usually 30)
- `--totp-window`: Number of time steps to tolerate for clock drift

## Listing and Checking Tokens

List all MFA tokens for a user:

```bash
radosgw-admin mfa list --uid myuser
```

Validate a token is working correctly:

```bash
radosgw-admin mfa check \
  --uid myuser \
  --totp-serial 1234567890 \
  --totp-pin 123456
```

## Enabling MFA Delete on a Bucket

Once a user has a TOTP token, enable MFA delete on a bucket using the AWS CLI with the MFA header:

```bash
aws s3api put-bucket-versioning \
  --bucket mybucket \
  --versioning-configuration Status=Enabled,MFADelete=Enabled \
  --mfa "1234567890 123456" \
  --endpoint-url http://your-rgw-host:7480
```

## Performing MFA-Protected Deletions

To delete a specific version of an object when MFA delete is enabled:

```bash
aws s3api delete-object \
  --bucket mybucket \
  --key myfile.txt \
  --version-id "version-id-here" \
  --mfa "1234567890 current-otp-code" \
  --endpoint-url http://your-rgw-host:7480
```

## Removing an MFA Token

If you need to rotate or remove a token:

```bash
radosgw-admin mfa remove \
  --uid myuser \
  --totp-serial 1234567890
```

## Resynchronizing a Token

If a token falls out of sync due to clock drift:

```bash
radosgw-admin mfa resync \
  --uid myuser \
  --totp-serial 1234567890 \
  --totp-pin 246810 \
  --totp-pin 123456
```

The `resync` command requires two consecutive TOTP pins: the previous pin and the current pin. This allows RGW to calculate the time offset and correct for clock drift.

## Summary

Ceph RGW MFA delete provides an extra layer of protection for versioned buckets by requiring a TOTP code for destructive operations. Tokens are managed per-user with `radosgw-admin mfa` commands. This feature maps directly to the AWS S3 MFA Delete API, making it compatible with standard S3 clients.
