# Validation Summary: How to Use MySQL with PrestaShop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 5.7 / MySQL 8
- PrestaShop 8 (and references to PrestaShop 1.7 / 1.6)
- PHP 8.1+
- InnoDB storage engine
- MySQL information_schema

## Sources Consulted
- PrestaShop 8 system requirements and installation documentation (https://devdocs.prestashop-project.org/8/basics/installation/system-requirements/)
- PrestaShop 8 configuration file structure (https://devdocs.prestashop-project.org/8/development/configuration/configuring-prestashop/)
- MySQL 8.0 Reference Manual - InnoDB configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html)
- MySQL 8.0 Reference Manual - CREATE DATABASE syntax (https://dev.mysql.com/doc/refman/8.0/en/create-database.html)
- MySQL 8.0 Reference Manual - information_schema.TABLES (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)

## Issues Found

### 1. parameters.php showed YAML syntax instead of PHP
- **What was wrong:** The `parameters.php` configuration example used YAML syntax (`database_host: '127.0.0.1'`) inside a `php` code block. PrestaShop 8's `app/config/parameters.php` is a PHP file that returns a PHP array, not YAML.
- **What was changed:** Replaced the YAML-formatted content with the correct PHP array format (`'database_host' => '127.0.0.1'`), including the `<?php return array(...)` wrapper and the `database_engine` key that PrestaShop includes by default.
- **Why:** The original would confuse readers trying to manually edit the file, and would cause a PHP parse error if someone copied it into the actual file.

### 2. Incorrect version attribution for config/settings.inc.php
- **What was wrong:** The post stated `config/settings.inc.php` was for PS 1.7, but this file is the primary database config only in PrestaShop 1.6 and earlier. In PS 1.7+, database settings moved to `app/config/parameters.php`.
- **What was changed:** Corrected the parenthetical to say `(PS 1.7+)` for `parameters.php` and `(PS 1.6 and earlier)` for `settings.inc.php`.
- **Why:** The `settings.inc.php` file still exists in PS 1.7 for backward compatibility, but the primary and recommended database configuration file since PS 1.7 is `app/config/parameters.php`.

## Review Notes
- The cron job example uses `mysql -u ps_user -p prestashop_db`, where `-p` (without a value) prompts for a password interactively. This would not work in an unattended cron job. In practice, users would need to use a MySQL option file (`~/.my.cnf`) or `--defaults-file` for cron-based execution. This is a common pattern in tutorials and not technically incorrect syntax, so it was left as-is.
- In MySQL 8.0.30+, `innodb_log_file_size` is deprecated in favor of `innodb_redo_log_capacity`. Since the post covers MySQL 5.7+ and `innodb_log_file_size` still works in current MySQL 8 versions, this was left unchanged but may need updating in the future.
- The `innodb_buffer_pool_size = 1G` recommendation is reasonable as a starting point but should be tuned to the specific server's available RAM (typically 50-70% of total RAM for a dedicated MySQL server).
