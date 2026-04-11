# Validation Summary: How to Use pt-duplicate-key-checker for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB indexing, schema optimization)
- Percona Toolkit (`pt-duplicate-key-checker`)
- Bash (CLI usage and output processing)

## Sources Consulted
- Percona Toolkit official documentation for pt-duplicate-key-checker (https://docs.percona.com/percona-toolkit/pt-duplicate-key-checker.html)
- Percona Toolkit source code for pt-duplicate-key-checker

## Issues Found
- **Line 89 — Imprecise description of foreign key handling**: The original text stated "The tool marks foreign key indexes with a warning so you do not drop them." The tool does not produce explicit warnings about foreign key indexes. Instead, it prints an informational note indicating which index MySQL uses for a given foreign key constraint (e.g., `# MySQL uses the idx_name index for this foreign key constraint`). Changed to: "The tool notes which indexes are used by foreign key constraints, so you can avoid dropping them."

## Review Notes
- All CLI flags (`--host`, `--user`, `--password`, `--databases`, `--verbose`, `--tables`) are confirmed valid in the official documentation.
- The `--tables` flag correctly accepts database-qualified table names (e.g., `mydb.orders`), as documented.
- The three duplicate types described (exact, left-prefix, primary key) are all detected by the tool. The "primary key duplicate" example (`PRIMARY KEY (id)` / `idx_id (id)`) would technically be caught as an exact or left-prefix duplicate rather than via the clustered-key detection feature (`--[no]clustered`), but the example is still correct and the index would be flagged as redundant.
- The `--verbose` flag shows all keys and foreign keys found, not just redundant ones. While the blog frames it as a foreign-key-specific feature, it is a reasonable use case for `--verbose` and not technically wrong.
- The tool also detects duplicate foreign keys (FK constraints covering the same columns referencing the same parent table), which the blog does not mention but is not required for the scope of this tutorial.
- The description of the tool as "read-only" is accurate — it only analyzes and reports; it does not modify any tables.
