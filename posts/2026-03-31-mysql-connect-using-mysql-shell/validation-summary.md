# Validation Summary: How to Connect to MySQL Using MySQL Shell

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Shell (`mysqlsh`)
- MySQL X Protocol (port 33060)
- MySQL Classic Protocol (port 3306)
- MySQL X Plugin

## Sources Consulted
- MySQL Shell 8.0 Reference Manual — mysqlsh command reference: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysqlsh.html
- MySQL Shell 8.4 Reference Manual — mysqlsh command reference: https://dev.mysql.com/doc/mysql-shell/8.4/en/mysqlsh.html
- MySQL 8.0 Reference Manual — Connecting Using URI-Like Strings: https://dev.mysql.com/doc/refman/8.0/en/connecting-using-uri-or-key-value-pairs.html
- MySQL Shell 8.0 — Configuring Options: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-configuring-options.html
- MySQL Shell 8.0 — Pluggable Password Configuration: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-pluggable-password-configuration-options.html
- MySQL 8.4 — Environment Variables: https://dev.mysql.com/doc/refman/8.4/en/environment-variables.html

## Issues Found

1. **`MYSQLSH_PASSWORD` environment variable does not exist.** The post claimed `MYSQLSH_PASSWORD=mypassword mysqlsh ...` could be used to pass a password via environment variable. This environment variable is not documented in official MySQL Shell documentation. **Fix:** Replaced with `echo "mypassword" | mysqlsh root@localhost --passwords-from-stdin --sql -e "SELECT 1;"`, which is the documented approach for non-interactive password input.

2. **Config file format was wrong (YAML instead of JSON).** The post referenced `.mysqlsh/options.yaml` with YAML syntax for persistent options. The actual file is `options.json` in JSON format, and it is internally managed by MySQL Shell — users should not edit it manually. **Fix:** Replaced with the `\option --persist` command, which is the documented way to set persistent MySQL Shell options.

3. **Misleading `--save-passwords` description.** The post described `mysqlsh --save-passwords` as "Create a stored connection profile." The `--save-passwords` flag controls whether passwords are saved to the credential store (values: `always`, `prompt`, `never`), not connection profiles. **Fix:** Updated the comment and added `=always` with a connection target to show proper usage.

## Review Notes
- The URI format comment omits the optional scheme prefix (`mysqlx://` or `mysql://`) and query parameters, but the simplified form shown is valid and commonly used. This is acceptable for a tutorial.
- The `--mysql` and `--mysqlx` flags also have shorter aliases `--mc` and `--mx` respectively, which could be mentioned but are not required.
- The `--sql` flag has variants `--sqlc` (SQL + classic) and `--sqlx` (SQL + X Protocol) that could be useful for advanced users but are not necessary for this introductory post.
