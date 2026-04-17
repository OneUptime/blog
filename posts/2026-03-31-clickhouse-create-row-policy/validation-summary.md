# Validation Summary: How to Create a Row Policy in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (CREATE ROW POLICY, ALTER ROW POLICY, DROP ROW POLICY, SHOW ROW POLICIES)
- ClickHouse access control (users, roles, default deny semantics)
- ClickHouse system tables (`system.row_policies`)
- ClickHouse dictionaries (`CREATE DICTIONARY`, `dictGet`)
- SQL / row-level security

## Sources Consulted
- [ClickHouse CREATE ROW POLICY](https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy)
- [ClickHouse ALTER ROW POLICY](https://clickhouse.com/docs/en/sql-reference/statements/alter/row-policy)
- [ClickHouse DROP ROW POLICY / DROP statements](https://clickhouse.com/docs/en/sql-reference/statements/drop)
- [ClickHouse system.row_policies](https://clickhouse.com/docs/en/operations/system-tables/row_policies)
- [ClickHouse CREATE USER](https://clickhouse.com/docs/en/sql-reference/statements/create/user)
- [ClickHouse currentUser() function](https://clickhouse.com/docs/en/sql-reference/functions/other-functions)

## Issues Found

1. **Basic syntax block listed unsupported `FOR` operations.** The original syntax block showed `[FOR {SELECT | INSERT | UPDATE | DELETE | ALL}]`. ClickHouse row policies only support `SELECT` queries; the documented grammar is `[FOR SELECT]`. Fixed the syntax block and added a clarifying sentence noting that row policies do not filter `INSERT`, `UPDATE` (mutations), or `DELETE`, and are intended to be paired with read-only access.

2. **Entire "Row Policies for INSERT" section was incorrect.** The post claimed `CREATE ROW POLICY ... FOR INSERT ...` is valid and that mismatched rows are silently filtered out on insert. ClickHouse does not support row policies on `INSERT`; this section was technically wrong end-to-end. Removed the section.

3. **`is_permissive` column does not exist in `system.row_policies`.** The example query selected `is_permissive`, but the actual column is `is_restrictive` (0 = PERMISSIVE, 1 = RESTRICTIVE). Renamed the column in the query.

4. **`DROP ROW POLICY IF EXISTS all ON ...` is not a wildcard.** ClickHouse has no `all` keyword for dropping every policy on a table; the parser would treat `all` as a literal policy name. Replaced the example with the correct multi-name form: `DROP ROW POLICY IF EXISTS tenant_isolation, admin_full_access ON analytics.events`.

## Review Notes
- The default-deny semantics described in the "Default Deny Behavior" section are accurate: once any row policy is defined for a table, users without a matching policy see no rows.
- Permissive vs. restrictive combination semantics (OR for permissive across the matching set, AND for restrictive) are correct.
- `currentUser()` is the canonical function name; aliases `current_user` and `user` also exist.
- `CREATE USER ... IDENTIFIED BY 'password' DEFAULT ROLE tenant_acme` is valid syntax in modern ClickHouse; ClickHouse implicitly grants the default role.
- The `SHOW CREATE ROW POLICY`, `SHOW ROW POLICIES`, and `ALTER ROW POLICY` examples match the documented grammar.
- The dictionary example (`CREATE DICTIONARY ... LAYOUT(HASHED()) LIFETIME(MIN 60 MAX 300)` with a `CLICKHOUSE` source) is valid and a reasonable pattern, though in production the dictionary password should not be inlined and the source database/table must exist.
- No version-specific caveats noted; row-policy syntax has been stable across recent ClickHouse releases.
