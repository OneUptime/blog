# Validation Summary: How to Use Comments in MySQL Queries

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (comment syntax, executable comments, optimizer hints)
- ProxySQL (query routing via comments)
- mysqldump (executable comment usage)

## Sources Consulted
- MySQL 8.0 Reference Manual — Comments: https://dev.mysql.com/doc/refman/8.0/en/comments.html
- MySQL 8.0 Reference Manual — Optimizer Hints: https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual — Local Variable Scope: https://dev.mysql.com/doc/refman/8.0/en/local-variable-scope.html

## Issues Found

1. **Hash comment section showed double-dash example**: The "Hash Comment (Single Line)" section's first code line used `--` (a double-dash comment) instead of `#` (the actual hash comment). Fixed by replacing the `--` example with a `#` example and removing the misleading "This is also a hash comment" wording.

2. **Incorrect explanation of `--5` ambiguity**: The post described `--5` as "negative five," but `--5` is double negation (equals positive 5), not negative five (`-5`). Changed to the standard MySQL docs example: "expressions like `a--b` (which could mean `a - (-b)`)."

3. **Deprecated `NO_HASH_JOIN` optimizer hint**: The `NO_HASH_JOIN` hint only worked in MySQL 8.0.18 and has no effect in MySQL 8.0.19+. Replaced with `NO_BNL`, which controls hash joins in MySQL 8.0.20+.

4. **Inaccurate optimizer hint portability claim**: The post stated optimizer hints are "silently ignored by other SQL databases." Oracle Database also recognizes `/*+ */` for its own optimizer hints, so this is not universally true. Updated to specify which databases ignore them (PostgreSQL, SQL Server) and note the Oracle exception.

5. **Variable naming collision in stored procedure**: The local variable `batch_id` shared its name with the `orders.batch_id` column. MySQL docs explicitly warn against this ("A local variable should not have the same name as a table column"). Renamed the variable to `v_batch_id` to follow MySQL best practices.

## Review Notes
- The `INDEX()` optimizer hint used in the post is valid but was only introduced in MySQL 8.0.20. The post says "MySQL 8" which is accurate but readers on older 8.0.x versions may not have this hint available.
- The executable comment example `/*!ENGINE=InnoDB*/` works but is more commonly seen with a version number prefix (e.g., `/*!40100 ENGINE=InnoDB */`) in real-world mysqldump output.
