# Validation Summary: How to Use BENCHMARK() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BENCHMARK() function)
- MySQL hashing functions (MD5, SHA1, SHA2)
- MySQL encryption functions (AES_ENCRYPT, AES_DECRYPT)
- MySQL string functions (CONCAT, CONCAT_WS, REGEXP, LIKE)
- MySQL JSON functions (JSON_EXTRACT, JSON_TABLE)
- Bash shell scripting (automated benchmark wrapper)

## Sources Consulted
- MySQL 8.0 Reference Manual — Information Functions (BENCHMARK): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_benchmark
- MySQL 8.0 Reference Manual — Encryption and Compression Functions (AES_ENCRYPT/AES_DECRYPT): https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html

## Issues Found

1. **`count` parameter described as "positive integer"** — The post stated `count` must be a "positive integer literal or variable." Per MySQL docs, negative values and NULL return NULL, but 0 is accepted (not listed as inappropriate). Changed "positive" to "non-negative" and added a note about NULL/negative behavior returning NULL.

2. **Shell script quoting bug** — The shell script used `MYSQL="mysql -u root -p'secret' -e"`. When a variable containing `-p'secret'` is expanded unquoted, the single quotes are treated as literal characters, causing the password passed to the mysql client to be `'secret'` (with literal quote characters) instead of `secret`. This would cause authentication failures. Fixed to `-psecret` (no quotes around the password inside the double-quoted variable assignment).

## Review Notes
- The `AES_ENCRYPT('data', 'key')` two-argument form is valid under the default `aes-128-ecb` block encryption mode. If a reader uses CBC/CFB/OFB modes, an init_vector parameter becomes required. The post doesn't mention this, but since it's a BENCHMARK tutorial (not an encryption tutorial), this is acceptable.
- The JSON_TABLE subquery inside BENCHMARK is valid per the docs: BENCHMARK accepts scalar subqueries (single column, single row). The `SELECT COUNT(*)` wrapper ensures a scalar result.
- The shell script uses unquoted variable expansion (`$MYSQL`) which is fragile with passwords containing spaces or special characters. For a production script an array (`MYSQL=(mysql -u root ...)`) with `"${MYSQL[@]}"` expansion would be more robust, but this is adequate for an illustrative example.
- The post correctly notes that BENCHMARK does not measure I/O or concurrency, and recommends supplementary tools (EXPLAIN ANALYZE, Performance Schema, pt-query-digest).
