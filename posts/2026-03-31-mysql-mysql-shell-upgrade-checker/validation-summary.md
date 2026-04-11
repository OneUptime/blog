# Validation Summary: How to Use MySQL Shell Upgrade Checker Utility

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (`util.checkForServerUpgrade()`)
- MySQL Server upgrade compatibility checking
- MySQL authentication plugins (`mysql_native_password`, `caching_sha2_password`)
- SQL (ALTER TABLE, ALTER USER, CREATE OR REPLACE VIEW)

## Sources Consulted
- MySQL Shell 8.4 Upgrade Checker Utility documentation: https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html
- MySQL Shell 9.6 Upgrade Checker Utility documentation: https://dev.mysql.com/doc/mysql-shell/9.6/en/mysql-shell-utilities-upgrade.html
- MySQL 8.4 SET Data Type Reference: https://dev.mysql.com/doc/refman/8.4/en/set.html
- MySQL 8.4 Deprecated and Removed Features: https://dev.mysql.com/doc/refman/8.4/en/added-deprecated-removed.html
- MySQL Shell 8.0.4 Upgrade Checker Blog Post: https://dev.mysql.com/blog-archive/mysql-shell-8-0-4-introducing-upgrade-checker-utility/

## Issues Found

1. **`outputFile` is not a valid parameter for `util.checkForServerUpgrade()`** — The blog used `outputFile: "/tmp/upgrade_report.json"` as an option in two code blocks. This parameter does not exist in any version of MySQL Shell. Fixed by replacing with shell-level output redirection (`mysqlsh ... -e "..." > file.json`) and removing the invalid option from code examples.

2. **Sample output claimed SET is an "obsolete column type"** — The `SET` data type is fully supported in all MySQL versions and is not obsolete, deprecated, or removed. The upgrade checker would never flag it. Replaced with a realistic example: pre-5.6.4 temporal types, which the upgrade checker does actually flag.

3. **Python mode used JavaScript-style camelCase function name** — The blog used `util.checkForServerUpgrade()` in a Python code block, but MySQL Shell's Python mode requires snake_case: `util.check_for_server_upgrade()`. Rewrote the Python section to use a standalone Python script invoking `mysqlsh` via subprocess, which is a more practical automation pattern.

4. **JSON output structure used wrong key name** — The blog accessed `report["checks"]` but the actual JSON output from `checkForServerUpgrade` uses `report["checksPerformed"]` as the top-level key for the array of check results. Fixed to use the correct key.

## Review Notes
- The post's list of checks performed by the utility (reserved keywords, deprecated storage engines, removed SQL modes, etc.) is accurate and well-chosen.
- The SQL examples for migrating authentication plugins and altering row formats are correct.
- The three severity levels (Error, Warning, Notice) are accurately described.
- The connection URI format `'root@myserver:3306'` is correct MySQL Shell syntax.
- The advice to run the checker against a copy of production data before upgrading is good practice.
