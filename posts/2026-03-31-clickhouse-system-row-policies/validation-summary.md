# Validation Summary: How to Use system.row_policies in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, row-level security)
- SQL (DDL for row policies: CREATE, ALTER, DROP ROW POLICY)
- ClickHouse Access Control (roles, grants, row policies)

## Sources Consulted
- ClickHouse official documentation: system.row_policies table (https://clickhouse.com/docs/en/operations/system-tables/row_policies)
- ClickHouse official documentation: CREATE ROW POLICY syntax (https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy)
- ClickHouse official documentation: ALTER ROW POLICY syntax (https://clickhouse.com/docs/en/sql-reference/statements/alter/row-policy)
- ClickHouse official documentation: DROP ROW POLICY syntax (https://clickhouse.com/docs/en/sql-reference/statements/drop#drop-row-policy)
- ClickHouse official documentation: currentUser() function (https://clickhouse.com/docs/en/sql-reference/functions/other-functions#currentuser)

## Issues Found

### 1. Wrong column name: `condition_as_string` (used in 4 queries)
- **What was wrong:** The blog used `condition_as_string` as a column name in `system.row_policies`. This column does not exist.
- **What was changed:** Replaced all occurrences with `select_filter`, which is the actual column name that stores the filter expression for SELECT queries.
- **Affected sections:** "Viewing All Row Policies", "Inspect Policy Conditions", "Check Which Roles Are Affected", "Modifying a Row Policy" (verify query).

### 2. Wrong column name: `restrictiveness` (used in 3 queries)
- **What was wrong:** The blog used `restrictiveness` as a column name, implying it returns string values like "PERMISSIVE" or "RESTRICTIVE". The actual column is `is_restrictive`, a UInt8 (0 = permissive, 1 = restrictive).
- **What was changed:** Replaced all occurrences with `is_restrictive`. Updated the explanatory text to describe the 0/1 values instead of string values.
- **Affected sections:** "Viewing All Row Policies", "Inspect Policy Conditions", "Check Which Roles Are Affected".

### 3. Wrong column name: `roles` (used in 3 queries)
- **What was wrong:** The blog used `roles` as a column name. This column does not exist. ClickHouse uses three separate columns: `apply_to_all` (UInt8), `apply_to_list` (Array(String)), and `apply_to_except` (Array(String)).
- **What was changed:** Replaced `roles` with `apply_to_list` in all queries, which shows the array of roles/users the policy applies to.
- **Affected sections:** "Viewing All Row Policies", "Inspect Policy Conditions", "Check Which Roles Are Affected".

### 4. Incomplete Columns Reference table
- **What was wrong:** The columns reference table listed only 6 columns, three of which had incorrect names. It was missing key columns like `short_name`, `id`, `apply_to_all`, and `apply_to_except`.
- **What was changed:** Replaced the table with the correct column names and descriptions, including all important columns from the actual system table schema.

## Review Notes
- The CREATE ROW POLICY, ALTER ROW POLICY, and DROP ROW POLICY DDL syntax is correct.
- The use of `currentUser()` in the USING clause is valid and correctly described.
- The conceptual explanation of permissive (OR) vs restrictive (AND) policy logic is accurate.
- The example combining row policies with column-level GRANT is valid.
- The `system.row_policies` table also has a `storage` column not included in the reference table, as it is rarely needed for typical use cases.
