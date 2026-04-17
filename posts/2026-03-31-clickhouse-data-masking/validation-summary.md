# Validation Summary: How to Use Data Masking in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, views, RBAC, access rights)
- ClickHouse string, hash, IP, and JSON functions (`replaceRegexpAll`, `splitByChar`, `concat`, `left`, `right`, `substring`, `IPv4StringToNum`, `IPv4NumToString`, `bitAnd`, `sipHash64`, `JSONExtractString`, `JSONHas`, `currentUser`)
- ClickHouse `MergeTree` table engine
- ClickHouse views (regular and materialized) with `SQL SECURITY` clause
- Data masking / pseudonymization patterns for PII (email, phone, credit card, IPv4)

## Sources Consulted
- ClickHouse string-replace functions: https://clickhouse.com/docs/en/sql-reference/functions/string-replace-functions
- ClickHouse IP address functions: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse array functions and indexing: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse other functions (`currentUser`): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse `CREATE USER`: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse `CREATE ROLE` and access rights: https://clickhouse.com/docs/en/sql-reference/statements/create/role, https://clickhouse.com/docs/operations/access-rights
- ClickHouse `CREATE VIEW` (including `DEFINER` / `SQL SECURITY`): https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse error codes (497 = ACCESS_DENIED): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp
- RE2 regex syntax (lookahead/lookbehind not supported): https://github.com/google/re2/wiki/Syntax

## Issues Found

1. **Regex lookahead not supported by ClickHouse `replaceRegexpAll`.**
   The "Built-in Functions Useful for Masking" section used `replaceRegexpAll('4111-1111-1111-1234', '[0-9](?=[0-9]{4})', '*')`. ClickHouse uses Google's re2 regex engine, which explicitly does not support lookahead `(?=...)` or lookbehind `(?<=...)` assertions — this expression would fail to compile at runtime. Rewrote the example to use `substring` + `replaceRegexpAll` + `right` and added a short inline comment noting the re2 limitation.

2. **Regex lookbehind + lookahead not supported in JSON masking example.**
   The "Masking Nested and JSON Fields" section used `replaceRegexpAll(..., '(?<=^.{2}).+(?=@)', '***')`. Same re2 limitation — would not compile. Rewrote the example to use `splitByChar('@', ...)` + `left` + `concat`, matching the email-masking pattern already established earlier in the post.

3. **Views default to `SQL SECURITY INVOKER`, which breaks the access-control pattern shown.**
   The post described creating a masked view, granting analysts SELECT only on the view, and revoking SELECT on the raw table — implying analysts could query the view without any grant on the underlying `customers_raw` table. Under ClickHouse's default `SQL SECURITY INVOKER` behavior for regular (non-materialized) views, the querying user must still have SELECT on the underlying tables, so the pattern as written would fail for the analyst. Added `DEFINER = CURRENT_USER SQL SECURITY DEFINER` to both `CREATE VIEW customers_masked` and `CREATE VIEW customers_conditional`, with a short inline comment explaining why.

## Review Notes
- `sipHash64(toString(user_id), 'secret_salt')` is technically valid — ClickHouse's `sipHash64` accepts multiple arguments and hashes them deterministically. The prose calls this a "keyed hash" with a "salt", which is slightly loose terminology (the salt becomes part of the hashed input; for a true keyed variant ClickHouse offers `sipHash64Keyed(key, ...)`), but the behavior described (consistent pseudonyms for the same user + salt) is correct. Left unchanged.
- Error code `497` for `ACCESS_DENIED` ("Not enough privileges") is confirmed by ClickHouse's `ErrorCodes.cpp`.
- The IPv4 /24 masking via `bitAnd(IPv4StringToNum(ip), 0xFFFFFF00)` is correct and idiomatic.
- `splitByChar('@', email)[1]` relies on ClickHouse's 1-based array indexing, which is correct.
- `CREATE USER ... IDENTIFIED WITH sha256_password BY '...'` and the RBAC statements (`CREATE ROLE`, `GRANT`, `REVOKE`) are all valid current syntax.
- Future improvement (not an error): the post could mention ClickHouse row policies (`CREATE ROW POLICY`) as a complementary mechanism, since they are referenced in the introduction but never demonstrated. Out of scope for a technical-correctness fix.
