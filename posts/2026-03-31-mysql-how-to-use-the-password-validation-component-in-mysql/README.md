# How to Use the Password Validation Component in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Password Validation, Administration, MySQL 8

Description: Learn how to install and configure the MySQL password validation component to enforce password strength requirements like length, complexity, and dictionary checks.

---

## What Is the Password Validation Component?

The password validation component (`validate_password`) enforces password strength policies in MySQL. It rejects passwords that do not meet defined criteria such as minimum length, character class requirements, or presence in a dictionary of weak passwords.

In MySQL 8.0, it was migrated from a plugin (`validate_password`) to a component (`component_validate_password`).

## Installing the Component (MySQL 8.0)

```sql
INSTALL COMPONENT 'file://component_validate_password';
```

Verify it is installed:

```sql
SELECT * FROM mysql.component;

-- Or check variables
SHOW VARIABLES LIKE 'validate_password%';
```

## Installing the Plugin (MySQL 5.7)

```sql
INSTALL PLUGIN validate_password SONAME 'validate_password.so';
```

Or in `my.cnf`:

```text
[mysqld]
plugin-load-add = validate_password.so
```

## Key Configuration Variables

```sql
SHOW VARIABLES LIKE 'validate_password%';
```

```text
+--------------------------------------+--------+
| Variable_name                        | Value  |
+--------------------------------------+--------+
| validate_password.check_user_name    | ON     |
| validate_password.dictionary_file    |        |
| validate_password.length             | 8      |
| validate_password.mixed_case_count   | 1      |
| validate_password.number_count       | 1      |
| validate_password.policy             | MEDIUM |
| validate_password.special_char_count | 1      |
+--------------------------------------+--------+
```

## Password Policy Levels

| Policy | Requirements |
|---|---|
| `LOW` | Minimum length only |
| `MEDIUM` | Length + digit + uppercase + lowercase + special char |
| `STRONG` | MEDIUM + dictionary file check |

Set the policy:

```sql
SET GLOBAL validate_password.policy = 'STRONG';
```

## Configuring Minimum Length and Complexity

```sql
-- Minimum password length
SET GLOBAL validate_password.length = 12;

-- Require at least 2 uppercase AND 2 lowercase letters
SET GLOBAL validate_password.mixed_case_count = 2;

-- Require at least 2 digits
SET GLOBAL validate_password.number_count = 2;

-- Require at least 1 special character
SET GLOBAL validate_password.special_char_count = 1;
```

## Using a Dictionary File (STRONG Policy)

A dictionary file contains common/weak passwords, one per line. MySQL rejects passwords found in the dictionary:

```bash
# Create a dictionary file
sudo bash -c "cat > /etc/mysql/bad_passwords.txt << 'EOF'
password
password123
admin
letmein
qwerty
mysql
welcome
EOF"
```

```sql
SET GLOBAL validate_password.policy = 'STRONG';
SET GLOBAL validate_password.dictionary_file = '/etc/mysql/bad_passwords.txt';
```

## Preventing Username as Password

```sql
SET GLOBAL validate_password.check_user_name = ON;
```

With this on, a user named `alice` cannot set their password to `alice` or its reverse (`ecila`). The comparison is case-insensitive.

## Testing Password Strength

Use the `VALIDATE_PASSWORD_STRENGTH()` function to test a password without actually setting it:

```sql
SELECT VALIDATE_PASSWORD_STRENGTH('ab') AS strength;
SELECT VALIDATE_PASSWORD_STRENGTH('mypassword') AS strength;
SELECT VALIDATE_PASSWORD_STRENGTH('V!3rX#9kLm2$') AS strength;
```

```text
+----------+
| strength |
+----------+
| 0        |
+----------+

+----------+
| strength |
+----------+
| 50       |
+----------+

+----------+
| strength |
+----------+
| 100      |
+----------+
```

Scores range from 0 (weakest) to 100 (strongest).

## Persisting Settings in my.cnf

```text
[mysqld]
validate_password.policy = STRONG
validate_password.length = 12
validate_password.mixed_case_count = 1
validate_password.number_count = 2
validate_password.special_char_count = 1
validate_password.check_user_name = ON
validate_password.dictionary_file = /etc/mysql/bad_passwords.txt
```

## Uninstalling the Component

```sql
UNINSTALL COMPONENT 'file://component_validate_password';
```

## Summary

The MySQL password validation component enforces password strength by checking length, character complexity, and optionally comparing against a dictionary of weak passwords. Install it with `INSTALL COMPONENT`, set `validate_password.policy = STRONG` for the highest protection level, and use `VALIDATE_PASSWORD_STRENGTH()` to test passwords programmatically before creating users.
