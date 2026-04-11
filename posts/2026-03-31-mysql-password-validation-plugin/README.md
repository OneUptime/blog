# What Is Password Validation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Password, Plugin, Validation

Description: MySQL's validate_password component enforces password strength policies including length, complexity, and dictionary checks before allowing a password to be set.

---

## Overview

MySQL provides the `validate_password` component (MySQL 8.0) and the older `validate_password` plugin (MySQL 5.7) to enforce password strength requirements. When enabled, any attempt to set or change a password is checked against configured policies. If the password does not meet the requirements, MySQL returns an error and refuses the operation. This prevents weak passwords from being set even by database administrators.

## Installation

For MySQL 8.0, install the component:

```sql
INSTALL COMPONENT 'file://component_validate_password';
```

Verify it is active:

```sql
SELECT * FROM mysql.component WHERE component_urn LIKE '%validate_password%';
```

## Password Policy Levels

The component offers three policy levels controlled by `validate_password.policy`:

| Policy | Description |
| --- | --- |
| LOW | Enforces minimum length only |
| MEDIUM | Enforces length, mixed case, digits, and special characters |
| STRONG | Adds dictionary file check on top of MEDIUM requirements |

Set the policy at runtime:

```sql
SET GLOBAL validate_password.policy = 'MEDIUM';
```

## Configuring Requirements

```sql
-- Minimum password length
SET GLOBAL validate_password.length = 12;

-- Minimum number of uppercase and lowercase letters (each)
SET GLOBAL validate_password.mixed_case_count = 1;

-- Minimum number of digits
SET GLOBAL validate_password.number_count = 1;

-- Minimum number of special characters
SET GLOBAL validate_password.special_char_count = 1;
```

Persist settings across restarts:

```sql
SET PERSIST validate_password.policy = 'MEDIUM';
SET PERSIST validate_password.length = 12;
```

## Testing a Password

You can check whether a password would pass validation without actually setting it:

```sql
SELECT validate_password_strength('WeakPass');
-- Returns 25 (weak)

SELECT validate_password_strength('C0mpl3x!Pass#99');
-- Returns 100 (strong)
```

The function returns a score from 0 to 100.

## Dictionary File (STRONG Policy)

To block passwords that contain dictionary words, provide a file path:

```sql
SET GLOBAL validate_password.dictionary_file = '/etc/mysql/password_dictionary.txt';
SET GLOBAL validate_password.policy = 'STRONG';
```

The file should contain one word per line:

```text
password
letmein
welcome
admin
```

## Viewing Current Configuration

```sql
SHOW VARIABLES LIKE 'validate_password%';
```

```text
+--------------------------------------+--------+
| Variable_name                        | Value  |
+--------------------------------------+--------+
| validate_password.length             | 12     |
| validate_password.mixed_case_count   | 1      |
| validate_password.number_count       | 1      |
| validate_password.policy             | MEDIUM |
| validate_password.special_char_count | 1      |
+--------------------------------------+--------+
```

## Error When Policy Is Violated

When a password fails validation:

```text
ERROR 1819 (HY000): Your password does not satisfy the current policy requirements
```

## Persisting in my.cnf

```ini
[mysqld]
validate_password.policy=MEDIUM
validate_password.length=12
validate_password.mixed_case_count=1
validate_password.number_count=1
validate_password.special_char_count=1
```

## Summary

The `validate_password` component is a simple but effective control that ensures all MySQL accounts use strong passwords. By configuring the MEDIUM or STRONG policy with appropriate length and complexity requirements, you reduce the risk of accounts being compromised through brute force or dictionary attacks. It should be used alongside other controls like SSL/TLS connections and account lockout policies.
