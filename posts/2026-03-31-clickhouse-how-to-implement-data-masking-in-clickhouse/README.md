# How to Implement Data Masking in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Masking, Security, Row Policy, Privacy

Description: Learn how to implement data masking in ClickHouse using row policies, column-level access control, and masking rules to protect sensitive data from unauthorized users.

---

## What Is Data Masking in ClickHouse

Data masking hides or obfuscates sensitive column values (PII, credentials, financial data) from users who should not see them. ClickHouse supports masking through:

- **Column-level permissions**: Deny SELECT on specific columns
- **Row policies**: Filter which rows users can see
- **Custom masking rules via views**: Expose masked data through views

## Method 1 - Column-Level Access Denial

Prevent specific users or roles from reading sensitive columns:

```sql
-- Deny access to sensitive columns for analysts role
REVOKE SELECT(email, phone, credit_card) ON default.customers FROM analysts;

-- Verify
SHOW GRANTS FOR analysts;
```

Users in the `analysts` role will get an error if they try to SELECT those columns.

## Method 2 - Masked Views

Create a view that exposes masked versions of sensitive columns:

```sql
-- Original table
CREATE TABLE customers (
    customer_id UInt64,
    name        String,
    email       String,
    phone       String,
    ssn         String
) ENGINE = MergeTree()
ORDER BY customer_id;

-- Masked view for analysts
CREATE VIEW customers_masked AS
SELECT
    customer_id,
    name,
    concat(substring(email, 1, 2), '***@', splitByChar('@', email)[2]) AS email,
    concat('***-***-', substring(phone, -4)) AS phone,
    '***-**-****' AS ssn
FROM customers;

-- Grant analysts access only to the masked view
GRANT SELECT ON default.customers_masked TO analysts;
REVOKE SELECT ON default.customers FROM analysts;
```

## Method 3 - Row Policies

Row policies filter which rows a user can see:

```sql
-- Create a row policy that limits non-admins to see only records that
-- belong to them (assuming the `name` column matches the ClickHouse user name)
CREATE ROW POLICY customer_self_access ON default.customers
    FOR SELECT
    USING name = currentUser()
    TO non_admin_users;

-- Admins see all rows
CREATE ROW POLICY admin_full_access ON default.customers
    FOR SELECT
    USING 1 = 1
    TO admin_role;
```

## Method 4 - Query Log Masking Rules

ClickHouse supports regex-based masking of query logs and server logs so sensitive literals (SSNs, card numbers, tokens) are not persisted even when queries reference them. Configure in `/etc/clickhouse-server/config.xml`:

```xml
<query_masking_rules>
    <rule>
        <name>hide SSN</name>
        <regexp>\b\d{3}-\d{2}-\d{4}\b</regexp>
        <replace>XXX-XX-XXXX</replace>
    </rule>
    <rule>
        <name>hide credit card</name>
        <regexp>\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b</regexp>
        <replace>XXXX-XXXX-XXXX-XXXX</replace>
    </rule>
</query_masking_rules>
```

Matched patterns are rewritten before entries are written to `system.query_log`, the server log files, and the process list. This protects against accidental PII exposure in log-based audits, but it does not affect the data returned by actual queries — use views or row policies for that.

## Practical Example - GDPR-Compliant Query Layer

```sql
-- Admin role sees everything
CREATE ROLE admin_role;
GRANT SELECT ON default.customers TO admin_role;

-- Analyst role sees only masked view
CREATE ROLE analyst_role;
GRANT SELECT ON default.customers_masked TO analyst_role;
REVOKE SELECT ON default.customers FROM analyst_role;

-- Assign roles to users
GRANT analyst_role TO john_doe;
GRANT admin_role TO alice;
```

## Masking Functions Useful in Views

```sql
SELECT
    customer_id,
    name,
    -- Mask email: show only first 2 chars of local part
    concat(
        substring(email, 1, 2),
        repeat('*', length(splitByChar('@', email)[1]) - 2),
        '@',
        splitByChar('@', email)[2]
    ) AS email_masked,

    -- Mask phone: show only last 4 digits
    concat(repeat('*', length(phone) - 4), substring(phone, -4)) AS phone_masked,

    -- Mask SSN: always show ***-**-XXXX
    concat('***-**-', substring(ssn, -4)) AS ssn_masked
FROM customers;
```

## Checking Who Has Access to Which Tables

```sql
SELECT
    user_name,
    database,
    table,
    column,
    access_type
FROM system.grants
WHERE table = 'customers'
ORDER BY user_name, access_type;
```

## Auditing Queries on Sensitive Tables

```sql
-- Monitor who is querying the customers table
SELECT
    event_time,
    user,
    client_hostname,
    query_kind,
    substring(query, 1, 300) AS query_snippet
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query ILIKE '%customers%'
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

Data masking in ClickHouse is implemented through column-level permission revocation, masked views with obfuscation functions, and row policies to restrict data visibility. For most use cases, creating masked views with `REVOKE` on the underlying table provides a simple and effective solution. Combine with query log auditing via `system.query_log` to monitor access to sensitive tables and detect policy violations.
