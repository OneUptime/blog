# Validation Summary: What Is Password Validation in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL 8.0 `validate_password` component
- MySQL 5.7 `validate_password` plugin (mentioned)
- MySQL password policy configuration (LOW, MEDIUM, STRONG)
- `validate_password_strength()` function

## Sources Consulted
- MySQL 8.0 Reference Manual: The Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Password Validation Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual: INSTALL COMPONENT Statement — https://dev.mysql.com/doc/refman/8.0/en/install-component.html

## Issues Found
1. **Incorrect comment on `mixed_case_count`**: The comment said "Minimum number of uppercase letters" but `validate_password.mixed_case_count` specifies the minimum number of both uppercase AND lowercase characters each. If set to 1, the password must contain at least 1 uppercase and at least 1 lowercase character. Fixed the comment to read "Minimum number of uppercase and lowercase letters (each)".

2. **Invalid `my.cnf` directive**: The `my.cnf` example included `validate_password.component_urn=file://component_validate_password`, which is not a valid MySQL system variable. Components installed via `INSTALL COMPONENT` are recorded in the `mysql.component` table and automatically loaded on server restart — no `my.cnf` entry is needed for installation. Removed the invalid line.

## Review Notes
- The `SHOW VARIABLES` output example omits some variables that would normally appear (e.g., `validate_password.check_user_name`, `validate_password.dictionary_file`). This is acceptable for illustration purposes but readers may see additional variables in practice.
- The `validate_password_strength()` return values of 25 and 100 shown in the examples are accurate for the given passwords under default settings, but the exact scores can vary depending on the configured policy parameters.
- The post correctly distinguishes between the MySQL 8.0 component and the older 5.7 plugin but focuses on the 8.0 component, which is appropriate.
