# Validation Summary: How to Design a Schema for User Authentication in MySQL

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MySQL (DDL: CREATE TABLE, DML: UPDATE/SELECT/DELETE)
- bcrypt / Argon2 password hashing (mentioned as best practice)
- Server-side session management
- JWT / OAuth refresh tokens
- TOTP-based multi-factor authentication

## Sources Consulted
- MySQL 8.0 Reference Manual — UPDATE Statement, specifically left-to-right evaluation of SET assignments: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — CREATE TABLE syntax and data types: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Date and Time Functions (NOW(), INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- RFC 6238 (TOTP) for MFA secret sizing considerations
- OWASP Authentication Cheat Sheet for schema design best practices

## Issues Found
1. **Account lockout triggers one attempt too early.** In the `UPDATE users` lockout query, the `locked_until` CASE expression used `WHEN failed_attempts + 1 >= 5`. Because MySQL evaluates single-table SET assignments left to right, `failed_attempts` already held the incremented value (from the preceding `failed_attempts = failed_attempts + 1` assignment) by the time the CASE was evaluated. This meant `failed_attempts + 1` was effectively `original_value + 2`, causing lockout after the 4th failed attempt instead of the intended 5th. **Fix:** Changed `WHEN failed_attempts + 1 >= 5` to `WHEN failed_attempts >= 5` so it correctly checks the already-incremented value.

## Review Notes
- The refresh token cleanup query (`DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NULL`) only removes expired tokens that were never revoked. Revoked-and-expired tokens accumulate indefinitely. Depending on audit requirements this may be intentional, but if not, the `AND revoked_at IS NULL` condition could be removed to clean up all expired tokens.
- The `mfa_secrets.secret` column stores the TOTP shared secret. In a production system, this value should be encrypted at the application layer or via MySQL's encryption functions, since anyone with database read access could generate valid TOTP codes. This is an application-level concern beyond the scope of a schema design post, but worth noting.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+. The use of `DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP` on DATETIME columns requires MySQL 5.6.5 or later.
