# How to Use Data Masking in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Privacy, Database, SQL

Description: Learn how to implement data masking in ClickHouse using row policies, views, and built-in functions to protect sensitive data from unauthorized access.

## Introduction

Data masking is the practice of replacing sensitive values with fictitious or obfuscated equivalents so that unauthorized users cannot read private information while still being able to work with realistic-looking data. In ClickHouse, you can implement masking at multiple layers: through SQL functions applied at query time, through views that expose only masked columns, and through row policies tied to user roles.

This guide covers practical, production-ready techniques for masking emails, phone numbers, credit card numbers, IP addresses, and other personally identifiable information (PII).

## Why Mask Data in ClickHouse

ClickHouse is frequently used as an analytics backend that receives raw event streams containing PII. Analysts, data scientists, and third-party tooling often need access to aggregated or filtered data without seeing the raw sensitive fields. Rather than copying and transforming data into a separate store, you can layer masking directly inside ClickHouse using views and policies.

## Built-in Functions Useful for Masking

ClickHouse ships several functions that are useful when writing masking expressions.

```sql
-- Replace all but the last four digits of a credit card number.
-- ClickHouse uses re2, which does not support lookaheads, so combine
-- substring() with replaceRegexpAll() and right() instead.
SELECT concat(
    replaceRegexpAll(substring('4111-1111-1111-1234', 1, length('4111-1111-1111-1234') - 4), '[0-9]', '*'),
    right('4111-1111-1111-1234', 4)
) AS masked_card;

-- Mask an email address, keeping the domain visible
SELECT concat(
    left(splitByChar('@', email)[1], 2),
    '***@',
    splitByChar('@', email)[2]
) AS masked_email
FROM users LIMIT 5;

-- Mask a phone number, keeping only the last four digits
SELECT concat('***-***-', right(phone, 4)) AS masked_phone
FROM users LIMIT 5;

-- Truncate an IPv4 address to /24 subnet
SELECT IPv4NumToString(
    bitAnd(IPv4StringToNum(ip_address), 0xFFFFFF00)
) AS masked_ip
FROM events LIMIT 5;
```

## Creating a Masking View

The most maintainable approach is to create a view that applies masking functions and grant regular users access to the view rather than the base table.

```sql
-- Base table storing raw PII
CREATE TABLE customers_raw
(
    id           UInt64,
    full_name    String,
    email        String,
    phone        String,
    credit_card  String,
    ip_address   String,
    created_at   DateTime
)
ENGINE = MergeTree()
ORDER BY (id, created_at);

-- Masked view that analysts will query. Use SQL SECURITY DEFINER so the
-- view is executed with the owner's privileges; analysts then need
-- SELECT only on the view, not on the underlying customers_raw table.
CREATE VIEW customers_masked
DEFINER = CURRENT_USER
SQL SECURITY DEFINER
AS
SELECT
    id,
    concat(left(full_name, 1), replaceAll(substring(full_name, 2), splitByChar(' ', full_name)[1], '****')) AS full_name,
    concat(left(splitByChar('@', email)[1], 2), '***@', splitByChar('@', email)[2])                        AS email,
    concat('***-***-', right(phone, 4))                                                                     AS phone,
    concat('****-****-****-', right(replaceAll(credit_card, '-', ''), 4))                                   AS credit_card,
    IPv4NumToString(bitAnd(IPv4StringToNum(ip_address), 0xFFFFFF00))                                        AS ip_address,
    toDate(created_at)                                                                                       AS created_date
FROM customers_raw;
```

## Role-Based Access to Masked Data

Grant analysts access only to the masked view, never to the raw table.

```sql
-- Create a role for analysts
CREATE ROLE analyst;

-- Grant read on the masked view only
GRANT SELECT ON analytics_db.customers_masked TO analyst;

-- Deny direct access to the raw table
REVOKE SELECT ON analytics_db.customers_raw FROM analyst;

-- Assign the role to a user
CREATE USER alice IDENTIFIED WITH sha256_password BY 'strongpassword';
GRANT analyst TO alice;
```

When Alice runs a query, she will always see masked data because she cannot access the raw table.

```sql
-- Alice sees this after logging in
SELECT email, phone FROM customers_masked LIMIT 3;
-- Output:
-- jo***@example.com  | ***-***-7890
-- ma***@corp.com     | ***-***-1234
-- sa***@gmail.com    | ***-***-5678
```

## Row-Level Masking with Column Transformations

You can also use conditional expressions to mask data based on who is querying. ClickHouse exposes `currentUser()` as a built-in function that returns the active username.

```sql
CREATE VIEW customers_conditional
DEFINER = CURRENT_USER
SQL SECURITY DEFINER
AS
SELECT
    id,
    full_name,
    if(
        currentUser() IN ('dba_user', 'security_admin'),
        email,
        concat(left(splitByChar('@', email)[1], 2), '***@', splitByChar('@', email)[2])
    ) AS email,
    if(
        currentUser() IN ('dba_user', 'security_admin'),
        phone,
        concat('***-***-', right(phone, 4))
    ) AS phone,
    created_at
FROM customers_raw;
```

DBA users see raw values; everyone else sees masked values in the same view.

## Masking with Hash-Based Pseudonymization

When you need masked values that are consistent across rows (for example, to join on a masked ID), use a keyed hash.

```sql
-- Replace real user IDs with a consistent pseudonym using sipHash64
SELECT
    sipHash64(toString(user_id), 'secret_salt') AS pseudo_user_id,
    event_type,
    toDate(event_time) AS event_date
FROM user_events
ORDER BY event_date DESC
LIMIT 10;
```

Because the salt is constant and the function is deterministic, the same user always maps to the same pseudonym within a session, allowing you to count unique pseudo-users without exposing real IDs.

## Masking Nested and JSON Fields

When your table stores semi-structured data in JSON strings, use `JSONExtractString` before applying the masking function.

```sql
SELECT
    event_id,
    concat(
        left(splitByChar('@', JSONExtractString(payload, 'email'))[1], 2),
        '***@',
        splitByChar('@', JSONExtractString(payload, 'email'))[2]
    ) AS masked_email
FROM raw_events
WHERE JSONHas(payload, 'email')
LIMIT 5;
```

## Testing Your Masking Rules

Always verify that the raw table is not reachable after applying access controls.

```sql
-- Switch to the analyst user and confirm access is denied
-- Run as alice:
SELECT * FROM customers_raw LIMIT 1;
-- Expected: Code: 497. Not enough privileges.

-- Confirm masked view is accessible
SELECT * FROM customers_masked LIMIT 1;
-- Expected: masked row with obfuscated fields
```

## Performance Considerations

Masking views add negligible overhead because the transformations run inline during the projection phase of query execution. However, keep the following in mind:

- String manipulation functions such as `replaceRegexpAll` are slightly more expensive than simple substring operations. Use them only on columns that actually need regex-level masking.
- If a masked view is queried heavily, consider materializing it as a `Materialized View` that writes pre-masked data to a separate table. This trades storage for CPU savings.
- Column masking does not affect predicate pushdown on other columns, so `WHERE` clauses on unmasked columns such as dates or IDs still benefit from the primary key index.

## Summary

ClickHouse provides flexible primitives for data masking: built-in string and hashing functions, SQL views, conditional expressions based on `currentUser()`, and role-based access controls. Combining these layers gives you a defense-in-depth approach where sensitive columns are obfuscated before analysts ever see them, without requiring a separate masked copy of your database.
