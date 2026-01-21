# How to Configure ClickHouse for GDPR Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GDPR, Compliance, Data Privacy, Data Deletion, Anonymization

Description: A comprehensive guide to configuring ClickHouse for GDPR compliance, covering data deletion, anonymization, retention policies, and right to be forgotten implementation.

---

GDPR compliance requires specific data handling capabilities. This guide covers implementing GDPR requirements in ClickHouse including data deletion, anonymization, and retention policies.

## Data Deletion (Right to Erasure)

### Using Lightweight Deletes

```sql
-- Enable lightweight deletes
SET allow_experimental_lightweight_delete = 1;

-- Delete user data
DELETE FROM events WHERE user_id = 12345;
DELETE FROM user_profiles WHERE id = 12345;
DELETE FROM orders WHERE customer_id = 12345;
```

### Using ALTER DELETE

```sql
-- Asynchronous deletion
ALTER TABLE events DELETE WHERE user_id = 12345;

-- Check mutation progress
SELECT
    table,
    mutation_id,
    command,
    create_time,
    is_done
FROM system.mutations
WHERE table = 'events';
```

## Data Anonymization

### Pseudonymization

```sql
-- Create anonymized view
CREATE VIEW events_anonymized AS
SELECT
    sipHash64(user_id) AS pseudonymized_user_id,
    timestamp,
    event_type,
    -- Remove or hash PII
    sipHash64(email) AS email_hash,
    country,  -- Keep non-PII
    substring(ip_address, 1, position(ip_address, '.', 3)) || '.0' AS ip_masked
FROM events;

-- Anonymize existing data
ALTER TABLE user_profiles
UPDATE
    email = concat('user_', toString(sipHash64(email)), '@anonymized.local'),
    phone = 'REDACTED',
    address = 'REDACTED'
WHERE user_id = 12345;
```

### Data Masking

```sql
-- Create a masked view
CREATE VIEW customers_masked AS
SELECT
    id,
    concat(substring(name, 1, 1), '***') AS name_masked,
    concat(substring(email, 1, 2), '***@', substringAfter(email, '@')) AS email_masked,
    concat('***-***-', right(phone, 4)) AS phone_masked,
    country,
    created_at
FROM customers;
```

## Retention Policies

### TTL for Automatic Deletion

```sql
-- Create table with TTL
CREATE TABLE user_activity (
    user_id UInt64,
    activity_time DateTime,
    activity_type String,
    details String
) ENGINE = MergeTree()
ORDER BY (user_id, activity_time)
TTL activity_time + INTERVAL 2 YEAR DELETE;

-- Add TTL to existing table
ALTER TABLE events
MODIFY TTL timestamp + INTERVAL 3 YEAR DELETE;

-- Different retention for different data types
ALTER TABLE logs
MODIFY TTL
    timestamp + INTERVAL 30 DAY DELETE,  -- Default
    timestamp + INTERVAL 7 DAY TO VOLUME 'cold'  -- Move to cold storage first
WHERE level != 'ERROR';  -- Keep errors longer
```

## Data Subject Access Request (DSAR)

```sql
-- Export all data for a user
SELECT *
FROM events
WHERE user_id = 12345
INTO OUTFILE '/tmp/user_12345_events.json'
FORMAT JSONEachRow;

-- Comprehensive data export
CREATE VIEW user_data_export AS
SELECT
    'events' AS source_table,
    *
FROM events
WHERE user_id = {user_id:UInt64}

UNION ALL

SELECT
    'profiles' AS source_table,
    *
FROM user_profiles
WHERE id = {user_id:UInt64}

UNION ALL

SELECT
    'orders' AS source_table,
    *
FROM orders
WHERE customer_id = {user_id:UInt64};
```

## Consent Tracking

```sql
-- Consent management table
CREATE TABLE user_consent (
    user_id UInt64,
    consent_type LowCardinality(String),
    granted UInt8,
    granted_at DateTime,
    revoked_at Nullable(DateTime),
    ip_address String,
    user_agent String
) ENGINE = ReplacingMergeTree(granted_at)
ORDER BY (user_id, consent_type);

-- Check consent before processing
SELECT
    e.*
FROM events e
INNER JOIN user_consent c ON e.user_id = c.user_id
WHERE c.consent_type = 'analytics'
  AND c.granted = 1
  AND c.revoked_at IS NULL;
```

## Audit Trail for GDPR

```sql
-- Track GDPR-related operations
CREATE TABLE gdpr_audit (
    timestamp DateTime DEFAULT now(),
    operation Enum8('deletion'=1, 'anonymization'=2, 'export'=3, 'consent_change'=4),
    user_id UInt64,
    requested_by String,
    tables_affected Array(String),
    rows_affected UInt64,
    request_reference String
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id);

-- Log deletion request
INSERT INTO gdpr_audit (operation, user_id, requested_by, tables_affected, request_reference)
VALUES ('deletion', 12345, 'support@company.com', ['events', 'profiles', 'orders'], 'GDPR-2024-001');
```

## Conclusion

GDPR compliance in ClickHouse requires:

1. **Deletion capabilities** using DELETE or ALTER DELETE
2. **Anonymization** for data that must be retained
3. **Retention policies** with TTL
4. **Data export** for subject access requests
5. **Consent tracking** for lawful processing
6. **Audit trails** for accountability

Implement these features to meet GDPR requirements while maintaining analytical capabilities.
