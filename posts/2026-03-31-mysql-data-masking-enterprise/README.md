# How to Use Data Masking in MySQL Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Masking, Security, Enterprise, Privacy

Description: Learn how to use MySQL Enterprise Data Masking functions to obfuscate sensitive data like credit cards, SSNs, and emails for development and testing.

---

MySQL Enterprise Data Masking and De-identification provides functions to mask, obfuscate, and generate realistic fake data. This is essential for sharing production data with development or QA teams without exposing real personal information. The component provides masking functions for common data formats as well as random data generators.

## Installing the Data Masking Component

In MySQL 8.0.33+, data masking is available as a component:

```sql
INSTALL COMPONENT 'file://component_masking';
INSTALL COMPONENT 'file://component_masking_functions';
```

For older versions using the plugin:

```sql
INSTALL PLUGIN data_masking SONAME 'data_masking.so';
```

## Verifying Installation

```sql
SELECT COMPONENT_URN, COMPONENT_ID
FROM mysql.component
WHERE COMPONENT_URN LIKE '%masking%';
```

## Masking Functions Overview

| Function | Description |
|----------|-------------|
| `mask_inner(str, margin1, margin2)` | Mask interior characters |
| `mask_outer(str, margin1, margin2)` | Mask outer characters |
| `mask_pan(str)` | Mask credit card PAN |
| `mask_pan_relaxed(str)` | Mask PAN keeping first 6 and last 4 |
| `mask_ssn(str)` | Mask US Social Security Number |
| `mask_iban(str)` | Mask IBAN |
| `mask_uuid(str)` | Mask UUID |

## Masking Credit Card Numbers

```sql
-- Full PAN masking
SELECT mask_pan('4111111111111111') AS masked_pan;
-- Result: XXXXXXXXXXXX1111

-- Relaxed PAN masking (keeps first 6 and last 4)
SELECT mask_pan_relaxed('4111111111111111') AS masked_pan_relaxed;
-- Result: 411111XXXXXX1111
```

## Masking Social Security Numbers

```sql
SELECT mask_ssn('123-45-6789') AS masked_ssn;
-- Result: ***-**-6789
```

## Masking Inner and Outer Characters

```sql
-- Mask inner characters (keep first 2 and last 4)
SELECT mask_inner('user@example.com', 2, 4) AS masked_email;
-- Result: usXXXXXXXXXX.com

-- Mask outer characters
SELECT mask_outer('sensitive data here', 3, 3) AS masked;
-- Result: XXXsitive data hXXX
```

## Generating Fake Data for Development

```sql
-- Generate random US SSN
SELECT gen_rnd_ssn() AS fake_ssn;

-- Generate random US phone number
SELECT gen_rnd_us_phone() AS fake_phone;

-- Generate random email
SELECT gen_rnd_email() AS fake_email;

-- Generate random PAN
SELECT gen_rnd_pan() AS fake_pan;
```

## Creating a Masked View for Development Teams

```sql
-- Masked view of users table for development
CREATE VIEW dev_users AS
SELECT
  id,
  mask_inner(email, 2, 4) AS email,
  mask_inner(full_name, 1, 1) AS full_name,
  mask_ssn(ssn) AS ssn,
  mask_pan_relaxed(credit_card) AS credit_card,
  created_at,
  country
FROM users;
```

```sql
-- Grant dev team access to the masked view only
GRANT SELECT ON mydb.dev_users TO 'dev_team'@'%';
```

## Creating a Masked Database Dump for Testing

```bash
# Export masked data for test environment
mysqldump mydb users \
  --where="1=1" \
  --no-create-info \
  --tab=/tmp/masked_export/ \
  --fields-terminated-by=','
```

Then run a masking transform:

```sql
-- Create masked copy of production table
CREATE TABLE test_users AS
SELECT
  id,
  gen_rnd_email() AS email,
  CONCAT('User_', id) AS full_name,
  gen_rnd_ssn() AS ssn,
  created_at
FROM users;
```

## Summary

MySQL Enterprise Data Masking provides built-in functions to protect sensitive data during development, testing, and reporting workflows. Use `mask_pan`, `mask_ssn`, and `mask_inner` to obfuscate real data, create masked views to limit developer exposure, and use `gen_rnd_*` functions to populate test databases with realistic fake data. This enables safe data sharing without violating GDPR, HIPAA, or PCI DSS requirements.
