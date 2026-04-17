# How to Implement Data Anonymization in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Anonymization, Security, Privacy, PII, GDPR

Description: Learn techniques for anonymizing sensitive data in ClickHouse including hashing, tokenization, generalization, and suppression for GDPR and privacy compliance.

---

Data anonymization transforms sensitive information so that individuals cannot be identified. ClickHouse provides a rich set of functions that you can combine to implement anonymization pipelines directly in SQL.

## Anonymization Techniques Overview

- **Hashing** - Replace identifiers with a one-way hash
- **Tokenization** - Replace values with reversible tokens stored in a separate system
- **Generalization** - Replace precise values with ranges (age 34 becomes 30-40)
- **Suppression** - Remove sensitive fields entirely
- **Pseudonymization** - Replace names with pseudonyms using a consistent mapping

## Hashing PII Fields

Use SHA256 to hash email addresses and phone numbers:

```sql
SELECT
    SHA256(email) AS email_hash,
    SHA256(phone) AS phone_hash,
    country,
    created_at
FROM users;
```

For a consistent but opaque identifier, use a salted hash with a secret value:

```sql
SELECT
    hex(SHA256(concat('secret_salt_', email))) AS email_token,
    country
FROM users;
```

## Generalizing Numeric Data

Replace precise ages with age ranges:

```sql
SELECT
    CASE
        WHEN age < 18 THEN 'under_18'
        WHEN age BETWEEN 18 AND 29 THEN '18-29'
        WHEN age BETWEEN 30 AND 44 THEN '30-44'
        WHEN age BETWEEN 45 AND 64 THEN '45-64'
        ELSE '65_plus'
    END AS age_group,
    count() AS user_count
FROM users
GROUP BY age_group;
```

Round timestamps to the nearest hour to reduce temporal precision:

```sql
SELECT
    toStartOfHour(event_time) AS event_hour,
    event_type,
    count() AS events
FROM user_events
GROUP BY event_hour, event_type;
```

## IP Address Anonymization

Truncate IP addresses to remove the host portion:

```sql
-- IPv4: zero out last octet
SELECT
    concat(
        arrayStringConcat(arraySlice(splitByChar('.', IPv4NumToString(ip)), 1, 3), '.'),
        '.0'
    ) AS anonymized_ip
FROM access_logs;
```

## Creating an Anonymized View

Build a view that serves anonymized data:

```sql
CREATE VIEW anonymized_users AS
SELECT
    cityHash64(user_id) AS anon_id,
    SHA256(email) AS email_hash,
    country,
    age_group,
    toStartOfMonth(created_at) AS signup_month
FROM (
    SELECT
        user_id,
        email,
        country,
        CASE
            WHEN age < 30 THEN 'under_30'
            WHEN age < 45 THEN '30-44'
            ELSE '45_plus'
        END AS age_group,
        created_at
    FROM users
);
```

Grant analysts access to the anonymized view only:

```sql
GRANT SELECT ON analytics_db.anonymized_users TO analyst_role;
REVOKE SELECT ON analytics_db.users FROM analyst_role;
```

## Suppression: Removing Sensitive Columns

For reports that do not need PII at all:

```sql
CREATE VIEW event_summary AS
SELECT
    toStartOfDay(event_time) AS event_date,
    event_type,
    device_type,
    country,
    count() AS event_count
FROM user_events
GROUP BY event_date, event_type, device_type, country;
```

## Data Masking for Support Contexts

Show partial data for support staff:

```sql
SELECT
    user_id,
    concat(substring(email, 1, 2), '****@', splitByChar('@', email)[2]) AS masked_email,
    concat('***-***-', substring(phone, -4)) AS masked_phone
FROM users
WHERE user_id = 12345;
```

## Summary

ClickHouse offers powerful SQL functions for implementing data anonymization including hashing, generalization, and suppression. Create anonymized views for analyst access, use GRANT/REVOKE to enforce access boundaries, and apply consistent anonymization logic in materialized views or ETL pipelines to ensure sensitive data never reaches unauthorized users.
