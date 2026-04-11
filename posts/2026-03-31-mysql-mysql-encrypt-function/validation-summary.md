# Validation Summary: How to Use ENCRYPT() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (5.6, 5.7, 8.0)
- Unix crypt() system call
- Python bcrypt library
- MySQL AES_ENCRYPT() function
- MySQL SHA2() function
- MySQL caching_sha2_password authentication plugin

## Sources Consulted
- MySQL 5.7 Reference Manual — ENCRYPT() function documentation (https://dev.mysql.com/doc/refman/5.7/en/encryption-functions.html#function_encrypt)
- MySQL 8.0 Reference Manual — Features Removed in MySQL 8.0 (https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html)
- MySQL 5.6 Release Notes for 5.6.17 (https://dev.mysql.com/doc/relnotes/mysql/5.6/en/news-5-6-17.html)
- MySQL 8.0 Reference Manual — AES_ENCRYPT() (https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_aes-encrypt)
- MySQL 8.0 Reference Manual — caching_sha2_password plugin (https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html)
- Python bcrypt library documentation (https://pypi.org/project/bcrypt/)

## Issues Found
No technical issues found.

## Review Notes
- The deprecation version cited (MySQL 5.6.17) aligns with when deprecation warnings were first added for ENCRYPT() and related functions. The MySQL 5.7 reference manual cites 5.7.6 as the formal deprecation version for that branch. Both are defensible; the post's choice of 5.6.17 is the more conservative (earlier) date.
- The exact removal version was MySQL 8.0.3 (a development release); saying "MySQL 8.0" is acceptable since the function was gone before the 8.0 GA release (8.0.11).
- The AES_ENCRYPT example uses SHA2() to derive a key, which produces a 64-character hex string rather than raw 32 bytes. MySQL internally adjusts the key length via XOR folding, so it works but is not ideal for production use. This is acceptable for a blog example.
- The post correctly advises against using ENCRYPT() or any MySQL-level function for password hashing and recommends application-level bcrypt or Argon2, which is sound security guidance.
