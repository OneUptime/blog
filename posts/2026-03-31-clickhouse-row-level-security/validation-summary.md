# Validation Summary: How to Use Row-Level Security in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (row policies, access control, MergeTree engine)
- SQL (CREATE ROW POLICY, CREATE USER, CREATE ROLE, GRANT)

## Sources Consulted
- ClickHouse official documentation — CREATE ROW POLICY: https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse official documentation — system.row_policies: https://clickhouse.com/docs/en/operations/system-tables/row_policies

## Issues Found

1. **Incorrect claim that row policies apply to INSERT and DELETE (line 24):** The original text stated ClickHouse appends the USING filter to "every SELECT, INSERT, and DELETE." Row policies only apply to SELECT queries (including subqueries and the SELECT part of INSERT...SELECT). Fixed to accurately describe the scope.

2. **Invalid `FOR INSERT` syntax in CREATE ROW POLICY (lines 118–130):** The original "Restricting INSERT with Row Policies" section used `CREATE ROW POLICY ... FOR INSERT USING ...`, which is not valid ClickHouse syntax. The CREATE ROW POLICY statement only supports `FOR SELECT`. Rewrote the section to explain that FOR SELECT policies indirectly filter INSERT...SELECT operations, and that row policies do not restrict direct INSERT VALUES statements.

3. **Overstated scope in Important Notes (line 219):** The original text claimed "Row policies apply to all query types including SELECT, INSERT ... SELECT, and subqueries." Corrected to clarify that row policies apply to SELECT queries (including subqueries and the SELECT portion of INSERT...SELECT) and do not filter DELETE or direct INSERT VALUES operations.

## Review Notes
- The post does not mention the `AS PERMISSIVE | RESTRICTIVE` syntax for row policies, which controls how multiple policies combine (permissive policies OR together, restrictive policies AND together). The deny-all pattern shown is functionally correct but the explicit syntax is worth knowing.
- The `currentUser()` subquery pattern in the dynamic policy section is a valid approach but is not explicitly shown in the official ClickHouse row policy documentation. It relies on standard SQL expression support in the USING clause.
- The official docs note that row policies "make sense only for users with readonly access," which is now reflected in the corrected INSERT section.
