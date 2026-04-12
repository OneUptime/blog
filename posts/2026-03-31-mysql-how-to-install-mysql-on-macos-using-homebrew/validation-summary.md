# Validation Summary: How to Install MySQL on macOS Using Homebrew

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Homebrew (macOS package manager)
- macOS (Apple Silicon and Intel)

## Sources Consulted
- Homebrew official documentation: https://docs.brew.sh/
- Homebrew install script: https://brew.sh/
- MySQL 8.0/8.4 Reference Manual — mysql_secure_installation: https://dev.mysql.com/doc/refman/8.4/en/mysql-secure-installation.html
- MySQL 8.0/8.4 Reference Manual — Server System Variables (bind-address, max_connections, innodb_buffer_pool_size): https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html
- Homebrew Formulae — mysql: https://formulae.brew.sh/formula/mysql
- Homebrew Formulae — mysql@8.0: https://formulae.brew.sh/formula/mysql@8.0

## Issues Found
No technical issues found.

## Review Notes
- The example `SELECT VERSION()` output shows `8.0.37`. As of early 2026, `brew install mysql` installs MySQL 9.x (Innovation release) or 8.4.x (LTS), so real output will differ. This is acceptable since the post labels it as "Example output" and does not claim a specific version is installed.
- The uninstall section only lists Apple Silicon paths (`/opt/homebrew/...`), while the configuration section correctly mentions both Apple Silicon and Intel paths. This is a minor inconsistency but not a technical error — Intel users can substitute `/usr/local/` for `/opt/homebrew/`.
- MySQL 8.0 reaches end of life in April 2026. The `mysql@8.0` versioned formula will eventually be deprecated from Homebrew. The post's primary recommendation (`brew install mysql`) installs the latest version, so this is not a concern for the main flow.
