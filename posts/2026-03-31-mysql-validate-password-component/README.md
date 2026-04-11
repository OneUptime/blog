# How to Configure MySQL Validate Password Component

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Password, Component, Validation

Description: Learn how to configure the MySQL Validate Password component to enforce strong password policies and protect your database from weak credentials.

---

## Overview

The MySQL Validate Password component enforces password strength requirements when users create or change passwords. It ensures passwords meet minimum length, complexity, and dictionary requirements before they are accepted, protecting against weak credentials that could be easily guessed or brute-forced.

## Installing the Component

In MySQL 8.0+, use the component system instead of the older plugin:

```sql
-- Install the validate_password component
INSTALL COMPONENT 'file://component_validate_password';

-- Verify installation
SELECT * FROM mysql.component
WHERE component_urn LIKE '%validate_password%';
```

For MySQL 5.7 (uses the plugin system instead):

```sql
INSTALL PLUGIN validate_password SONAME 'validate_password.so';
```

## Understanding Password Policy Levels

The component supports three policy levels:

```text
LOW    - Checks only password length
MEDIUM - Checks length, mixed case, digits, and special characters
STRONG - All of MEDIUM plus dictionary file check
```

## Configuring Password Policy

```sql
-- View current settings
SHOW VARIABLES LIKE 'validate_password%';

-- Set policy to STRONG
SET GLOBAL validate_password.policy = 'STRONG';

-- Require minimum 12 characters
SET GLOBAL validate_password.length = 12;

-- Require at least 2 uppercase and 2 lowercase letters
SET GLOBAL validate_password.mixed_case_count = 2;

-- Require at least 2 digits
SET GLOBAL validate_password.number_count = 2;

-- Require at least 2 special characters
SET GLOBAL validate_password.special_char_count = 2;

-- Path to dictionary file for STRONG policy
SET GLOBAL validate_password.dictionary_file = '/etc/mysql/password_dictionary.txt';
```

## Making Configuration Persistent

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
validate_password.policy=STRONG
validate_password.length=12
validate_password.mixed_case_count=2
validate_password.number_count=2
validate_password.special_char_count=2
```

## Testing Password Validation

Before creating a user, test whether a password meets the policy:

```sql
-- Test a password against the current policy
SELECT VALIDATE_PASSWORD_STRENGTH('MyPassword123!');
-- Returns 0 (weak) to 100 (strong)

-- Test various passwords
SELECT
    password,
    VALIDATE_PASSWORD_STRENGTH(password) AS strength
FROM (
    SELECT 'password' AS password UNION ALL
    SELECT 'MyPass1!' UNION ALL
    SELECT 'MyStr0ng!Pass#2024'
) p;
```

Example output:

```text
+-------------------+----------+
| password          | strength |
+-------------------+----------+
| password          |       25 |
| MyPass1!          |       50 |
| MyStr0ng!Pass#2024|      100 |
+-------------------+----------+
```

## Creating Users with Compliant Passwords

```sql
-- This will fail if password doesn't meet the policy
CREATE USER 'app_user'@'%'
  IDENTIFIED BY 'Str0ng!Pass#2024';

-- If a password is rejected, you'll get:
-- ERROR 1819 (HY000): Your password does not satisfy the current
-- policy requirements
```

## Temporary Override for Administrative Tasks

Administrators can temporarily lower the policy to handle legacy accounts:

```sql
-- Temporarily lower policy (admin only, use with caution)
SET GLOBAL validate_password.policy = 'LOW';

-- Update the legacy account
ALTER USER 'legacy_user'@'%' IDENTIFIED BY 'simplepass';

-- Restore the policy immediately
SET GLOBAL validate_password.policy = 'STRONG';
```

## Summary

The MySQL Validate Password component is an essential security control for enforcing strong password practices across all database accounts. Configure the `STRONG` policy level with a minimum length of 12 characters, mixed case requirements, digit requirements, and special character requirements. Use `VALIDATE_PASSWORD_STRENGTH()` to test passwords before creating accounts, and add the dictionary file path for the most thorough validation. Persist these settings in `my.cnf` to ensure they survive server restarts.
