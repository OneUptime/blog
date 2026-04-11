# Validation Summary: How to Configure MySQL Validate Password Component

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (component system)
- MySQL 5.7 (plugin system)
- MySQL Validate Password component/plugin
- SQL (DDL, system variable configuration)

## Sources Consulted
- MySQL 8.0 Reference Manual: The Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Password Validation Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual: VALIDATE_PASSWORD_STRENGTH() function — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_validate-password-strength
- MySQL 8.0 Reference Manual: INSTALL COMPONENT Statement — https://dev.mysql.com/doc/refman/8.0/en/install-component.html
- MySQL 5.7 Reference Manual: The Password Validation Plugin — https://dev.mysql.com/doc/refman/5.7/en/validate-password.html

## Issues Found

1. **Incorrect comment for `validate_password.mixed_case_count`**: The comment said "Require at least 2 uppercase letters." Per MySQL documentation, `validate_password.mixed_case_count` specifies the minimum number of both lowercase AND uppercase characters. A value of 2 means the password must contain at least 2 uppercase AND at least 2 lowercase characters. Fixed the comment to "Require at least 2 uppercase and 2 lowercase letters."

2. **Incorrect `VALIDATE_PASSWORD_STRENGTH` example output for 'password'**: The example showed `VALIDATE_PASSWORD_STRENGTH('password')` returning `0`. With default settings (`validate_password.length=8`), the string `'password'` is 8 characters long and passes the LOW policy (length check), so it should return `25` (passes LOW but fails MEDIUM due to no uppercase, digits, or special characters). A return value of `0` would mean the password fails even the length check. Changed the example output from `0` to `25`.

## Review Notes
- The example output for `VALIDATE_PASSWORD_STRENGTH` is illustrative. The exact return values depend on the current `validate_password` system variable settings. The post configures `validate_password.length=12` in an earlier section, but the example output is consistent with default settings (`length=8`). This is acceptable since readers may run the test independently of the prior configuration.
- The "Temporary Override for Administrative Tasks" section demonstrates lowering the password policy to handle legacy accounts. While technically correct, this is a security anti-pattern. The post appropriately notes "use with caution" but could in the future add a stronger warning or suggest alternative approaches (e.g., using `mysql_native_password` with `--skip-grant-tables` for one-time migrations).
- The persistent configuration section references `/etc/mysql/mysql.conf.d/mysqld.cnf`, which is specific to Debian/Ubuntu MySQL packages. Other distributions may use `/etc/my.cnf` or `/etc/mysql/my.cnf`. The summary section correctly references the more generic `my.cnf`.
- The MySQL 5.7 plugin uses underscored variable names (`validate_password_policy`) while the 8.0 component uses dotted names (`validate_password.policy`). The post correctly uses dot notation throughout since it focuses on 8.0+, but readers using 5.7 should be aware of this difference.
