# How to Implement PII Data Protection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PII, Privacy, GDPR, Data Protection, Masking, Encryption

Description: Learn how to protect Personally Identifiable Information in ClickHouse using column-level grants, data masking, encryption, and retention policies.

---

Personally Identifiable Information (PII) requires special handling to comply with GDPR, CCPA, and similar regulations. ClickHouse provides several tools for protecting PII through access control, masking, encryption, and data lifecycle management.

## Identifying PII in Your Schema

Start by cataloging PII fields in your tables:

```sql
-- Query column metadata to find potential PII fields
SELECT database, table, name, type
FROM system.columns
WHERE table NOT LIKE '.%'
  AND (
    lower(name) LIKE '%email%'
    OR lower(name) LIKE '%phone%'
    OR lower(name) LIKE '%address%'
    OR lower(name) LIKE '%ssn%'
    OR lower(name) LIKE '%passport%'
    OR lower(name) LIKE '%birth%'
  )
ORDER BY database, table, name;
```

## Restricting Access to PII Columns

Use column-level grants to limit who can see raw PII:

```sql
-- Analysts see non-PII columns only
CREATE ROLE analyst_no_pii;
GRANT SELECT(user_id, event_type, timestamp, device_type, country)
ON analytics_db.user_events TO analyst_no_pii;

-- PII access for authorized users only
CREATE ROLE pii_authorized;
GRANT SELECT ON analytics_db.user_events TO pii_authorized;
```

## Creating a Masked View

Provide a masked version of PII for general use:

```sql
CREATE VIEW analytics_db.user_events_masked AS
SELECT
    user_id,
    event_type,
    timestamp,
    device_type,
    country,
    -- Mask email: show only domain
    concat('****@', splitByChar('@', email)[2]) AS email_domain,
    -- Hash phone for pseudonymization
    hex(SHA256(phone)) AS phone_hash,
    -- Truncate IP to /24
    concat(
        arrayStringConcat(arraySlice(splitByChar('.', ip_address), 1, 3), '.'),
        '.0'
    ) AS ip_prefix
FROM analytics_db.user_events;

GRANT SELECT ON analytics_db.user_events_masked TO analyst_no_pii;
```

## Encrypting PII at Rest

Store sensitive fields encrypted in the database:

```sql
CREATE TABLE analytics_db.user_profiles (
    user_id UInt64,
    -- Non-PII fields stored plaintext
    country LowCardinality(String),
    signup_date Date,
    -- PII stored encrypted
    email_encrypted String,
    phone_encrypted String
) ENGINE = MergeTree()
ORDER BY (user_id, signup_date);

-- Insert with encryption
INSERT INTO analytics_db.user_profiles
SELECT
    user_id,
    country,
    signup_date,
    encrypt('aes-256-gcm', email, 'your_32_byte_encryption_key_here', 'your_16byte_iv__'),
    encrypt('aes-256-gcm', phone, 'your_32_byte_encryption_key_here', 'your_16byte_iv__')
FROM staging.raw_users;
```

## Right to Erasure (GDPR Article 17)

Implement deletion of PII for erasure requests:

```sql
-- Delete a specific user's PII (requires mutations)
ALTER TABLE analytics_db.user_profiles
DELETE WHERE user_id = 12345;

-- Replace PII with anonymized values instead of deleting the row
ALTER TABLE analytics_db.user_profiles
UPDATE
    email_encrypted = encrypt('aes-256-gcm', 'deleted@example.com', 'your_32_byte_encryption_key_here', 'your_16byte_iv__'),
    phone_encrypted = encrypt('aes-256-gcm', '0000000000', 'your_32_byte_encryption_key_here', 'your_16byte_iv__')
WHERE user_id = 12345;
```

## PII Retention Policies with TTL

Automatically expire PII after a retention period:

```sql
CREATE TABLE analytics_db.user_pii (
    user_id UInt64,
    email String,
    phone String,
    collected_at DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, collected_at)
TTL collected_at + INTERVAL 2 YEAR DELETE;
```

## Audit Logging for PII Access

Track who accesses PII tables:

```sql
SELECT
    event_time,
    user,
    client_hostname,
    query
FROM system.query_log
WHERE has(tables, 'analytics_db.user_profiles')
  AND type = 'QueryFinish'
  AND query NOT LIKE '%system%'
ORDER BY event_time DESC
LIMIT 50;
```

## Summary

PII protection in ClickHouse uses a layered approach: column-level grants restrict raw PII access, masked views provide safe alternatives for analysts, application-level encryption protects stored values, TTL policies enforce retention limits, and query logging creates an audit trail of PII access. Together these controls support GDPR and CCPA compliance requirements.
