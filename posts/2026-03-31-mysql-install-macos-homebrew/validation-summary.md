# Validation Summary: How to Install MySQL 8.0 on macOS with Homebrew

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- macOS
- Homebrew package manager
- `brew services` (launchd integration)
- `mysql_secure_installation`

## Sources Consulted
- Homebrew Formulae: mysql and mysql@8.0 — https://formulae.brew.sh/formula/mysql
- MySQL 8.0 Reference Manual: mysql_secure_installation — https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual: CREATE USER — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Server System Variables — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- Homebrew Documentation: brew services — https://docs.brew.sh/Manpage#services-subcommand

## Issues Found

1. **Misleading version statement for unversioned formula**: The post stated "At time of writing that is MySQL 8.0 / 8.4" for `brew install mysql`. The unversioned `mysql` formula in Homebrew tracks the latest stable release, which may be MySQL 9.x. Changed to clarify that the unversioned formula may install a newer major version and to use `mysql@8.0` for MySQL 8.0 specifically.

2. **Missing service name note for versioned formula**: The post showed `brew install mysql@8.0` and `brew link mysql@8.0 --force` but all subsequent service commands used `mysql` (e.g., `brew services start mysql`). Versioned formulas require the versioned name in service commands. Added a note clarifying that users of the versioned formula must use `mysql@8.0` in all `brew services` commands.

3. **Missing initial password prompt in `mysql_secure_installation` output**: The example output omitted the first prompt where the script asks for the current root password. On Homebrew installs, root has no initial password and the user must press Enter. Added the missing prompt line to prevent confusion.

4. **Dev user granted root-equivalent privileges**: The `GRANT ALL PRIVILEGES ON *.* ... WITH GRANT OPTION` gave the dev user full superuser access, contradicting the advice to avoid using root. Changed to scope privileges to a specific database (`myapp.*`) and removed `WITH GRANT OPTION`, which is a more appropriate example for application development.

## Review Notes
- `FLUSH PRIVILEGES` is not strictly necessary after `CREATE USER` and `GRANT` statements (MySQL automatically reloads the grant tables for these commands). It is only required when directly modifying the `mysql` grant tables. Left as-is since it is harmless and commonly included in tutorials.
- The `brew services list` output format may vary slightly across Homebrew versions. The example shown is representative but users may see minor formatting differences.
- MySQL 8.0 reached end of life in April 2026. The post remains useful for existing installations but readers should consider MySQL 8.4 LTS for new projects.
- The configuration snippet in the "Locating the Configuration File" section shows file paths inside a bash code block. These are paths, not commands, which could cause minor confusion, but the surrounding context makes the intent clear.
