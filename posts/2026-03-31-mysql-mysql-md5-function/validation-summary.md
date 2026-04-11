# Validation Summary: How to Use MD5() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (MD5, CONCAT, UNHEX, HEX, LEFT, SHA2 functions)
- Python (bcrypt library)

## Sources Consulted
- MySQL 8.0 Reference Manual: MD5() function — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_md5
- RFC 1321 (The MD5 Message-Digest Algorithm) for expected hash outputs
- Local `md5` command-line tool to independently verify all hash values in the post

## Issues Found
- **Incorrect MD5 hash for 'MySQL'**: The post claimed `MD5('MySQL')` returns `22cde252a3a2e5bd2fc1742f2f548fc3`. The correct hash is `62a004b95946bb97541afa471dcca73a`. Verified using the system `md5` utility. Fixed in README.md.

## Review Notes
- The deduplication example using `CONCAT(first_name, last_name, email)` without a separator has a subtle edge case: different field boundaries can produce the same concatenated string (e.g., first_name='JohnD', last_name='oe' vs first_name='John', last_name='Doe'). Using a separator like `CONCAT_WS('|', ...)` would be more robust, but this is a style improvement rather than a technical error.
- The mention of `caching_sha2_password` as an alternative to MD5 for passwords mixes MySQL authentication plugins with application-level password hashing. The plugin is for MySQL user authentication, not for hashing passwords stored in application tables. The bcrypt/Argon2 recommendation that follows is the correct guidance for application password storage.
- All other hash values (MD5 of 'hello', empty string, NULL) are correct.
- All SQL syntax is valid MySQL.
- The Python bcrypt example is syntactically correct.
