# How to Set Up Ceph Object Lock for WORM Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Lock, WORM, Compliance, S3

Description: Configure Ceph RGW Object Lock in Compliance or Governance mode to create immutable WORM storage for regulatory compliance, audit logs, and financial records.

---

WORM (Write Once Read Many) storage is required by regulations like SEC 17a-4, FINRA, and CFTC for financial records, and by healthcare regulations for audit logs. Ceph RGW implements S3-compatible Object Lock, providing WORM functionality natively.

## Enable Object Lock on an RGW Bucket

Object Lock must be enabled at bucket creation time - it cannot be added to existing buckets. Ceph RGW (Reef and later) supports S3 Object Lock by default. When you create a bucket with Object Lock enabled, versioning is automatically enabled on that bucket.

Create a bucket with Object Lock enabled:

```bash
aws s3api create-bucket \
  --bucket worm-compliance \
  --endpoint-url https://rgw.example.com \
  --object-lock-enabled-for-bucket
```

## Configure Default Retention

Set a default retention policy so all objects are automatically protected:

```bash
# Compliance mode - cannot be shortened or removed by any user
aws s3api put-object-lock-configuration \
  --bucket worm-compliance \
  --endpoint-url https://rgw.example.com \
  --object-lock-configuration \
  '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Days": 2555
      }
    }
  }'
```

Governance mode allows administrators with special permissions to override:

```bash
aws s3api put-object-lock-configuration \
  --bucket worm-audit-logs \
  --endpoint-url https://rgw.example.com \
  --object-lock-configuration \
  '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 365
      }
    }
  }'
```

## Upload Objects with Explicit Retention

Override the default retention for specific objects:

```bash
# Retain for exactly 7 years from today
RETAIN_UNTIL=$(date -d "+7 years" -u +"%Y-%m-%dT%H:%M:%SZ")

aws s3api put-object \
  --bucket worm-compliance \
  --key financial/q4-2025-report.pdf \
  --body q4-2025-report.pdf \
  --object-lock-mode COMPLIANCE \
  --object-lock-retain-until-date $RETAIN_UNTIL \
  --endpoint-url https://rgw.example.com
```

## Verify Object Lock Status

Check the lock status of an object:

```bash
aws s3api get-object-retention \
  --bucket worm-compliance \
  --key financial/q4-2025-report.pdf \
  --endpoint-url https://rgw.example.com
```

Try to delete a locked object (should fail):

```bash
aws s3 rm s3://worm-compliance/financial/q4-2025-report.pdf \
  --endpoint-url https://rgw.example.com
# Expected: Access Denied
```

## Legal Hold

Apply a legal hold independent of retention dates:

```bash
aws s3api put-object-legal-hold \
  --bucket worm-compliance \
  --key evidence/document.pdf \
  --legal-hold Status=ON \
  --endpoint-url https://rgw.example.com
```

## Summary

Ceph RGW Object Lock provides S3-compatible WORM storage through Compliance and Governance retention modes. Create buckets with Object Lock enabled at creation time and configure default retention policies appropriate to your regulatory requirements. Use COMPLIANCE mode for records that must be truly immutable and GOVERNANCE mode where administrative override is needed.
