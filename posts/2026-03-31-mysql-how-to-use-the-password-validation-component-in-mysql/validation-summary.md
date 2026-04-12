# Validation Summary: How to Use the Password Validation Component in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (component_validate_password)
- MySQL 5.7 (validate_password plugin)
- Password validation and security configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: The Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Password Validation Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual: VALIDATE_PASSWORD_STRENGTH() — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_validate-password-strength
- MySQL 8.0 Reference Manual: INSTALL COMPONENT — https://dev.mysql.com/doc/refman/8.0/en/install-component.html
- MySQL 8.0 Reference Manual: mysql.component Table — https://dev.mysql.com/doc/refman/8.0/en/component-table.html

## Issues Found

1. **Wrong table for verifying component installation**: The post queried `performance_schema.replication_group_members` (which is for Group Replication status) to verify the password validation component was installed. Changed to `SELECT * FROM mysql.component;` which is the correct table for listing installed components.

2. **Incorrect comment on `mixed_case_count`**: The comment said "Require at least 2 uppercase letters" but `validate_password.mixed_case_count` specifies the minimum number of both uppercase AND lowercase characters. Changed comment to "Require at least 2 uppercase AND 2 lowercase letters."

3. **Inaccurate `check_user_name` description**: The post stated a user cannot set their password to their username "or any variation." Per the MySQL docs, this check only compares against the exact username and its reverse, case-insensitively. Updated to reflect the actual behavior.

4. **Incorrect `VALIDATE_PASSWORD_STRENGTH()` example output**: With default settings (length=8, no dictionary), `'test'` (4 chars) returns 25 (not 0) because length >= 4 but < validate_password.length. And `'MyP@ssw0rd!'` passes all policy levels (including STRONG with no dictionary configured) returning 100, not 50. Changed example passwords to `'ab'` (returns 0, length < 4), `'mypassword'` (returns 50, passes LOW but fails MEDIUM due to no uppercase/digits/special chars), and kept `'V!3rX#9kLm2$'` (returns 100).

5. **Unrelated `component_scheduler.enabled` in my.cnf**: The `component_scheduler.enabled = ON` line in the persistence section is unrelated to password validation — it controls the MySQL component scheduler (a separate feature). Removed it.

## Review Notes
- The `VALIDATE_PASSWORD_STRENGTH()` function returns discrete scores (0, 25, 50, 75, 100) based on which policy level the password satisfies, not a granular 0-100 range. The post's description "Scores range from 0 (weakest) to 100 (strongest)" is technically from the docs but could be misleading — the actual return values are stepped, not continuous.
- The MySQL 5.7 plugin uses underscore-separated variable names (`validate_password_length`) while the 8.0 component uses dot-separated names (`validate_password.length`). The post correctly uses dot notation throughout since it focuses on 8.0, but could benefit from a note about this difference for users migrating from 5.7.
