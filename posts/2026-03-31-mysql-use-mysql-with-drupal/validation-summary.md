# Validation Summary: How to Use MySQL with Drupal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Drupal 10/11
- PHP (PDO extension)
- Drush (Drupal CLI)
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual — Query Cache removal: https://dev.mysql.com/doc/refman/8.0/en/query-cache.html
- MySQL 8.0 Reference Manual — Server System Variables (query_cache_type removed): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- Drupal System Requirements documentation: https://www.drupal.org/docs/getting-started/system-requirements/database-server-requirements
- Drupal Database API (PDO-based, no mysqli): https://www.drupal.org/docs/drupal-apis/database-api
- Drush documentation — SQL commands: https://www.drush.org/12.x/commands/sql_dump/
- MySQL 8.0 Reference Manual — InnoDB Redo Log (innodb_log_file_size deprecation in 8.0.30+): https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html

## Issues Found

### 1. `query_cache_type = 0` included in my.cnf for MySQL 8.0+
**What was wrong:** The my.cnf example included `query_cache_type = 0`, but the query cache was completely removed in MySQL 8.0. This variable is unrecognized in MySQL 8.0+ and can prevent the server from starting or produce warnings. The post's own text acknowledged the removal but contradictorily included the setting.
**What was changed:** Removed `query_cache_type = 0` from the my.cnf example and updated the explanatory text to warn against including query cache settings in MySQL 8.0+.

### 2. `mysqli` listed as a required PHP extension
**What was wrong:** The prerequisites section stated that both `mysqli` and `pdo_mysql` PHP extensions must be active. Drupal uses PDO exclusively for all database operations and does not require or use the `mysqli` extension.
**What was changed:** Updated prerequisites to mention only `pdo_mysql` and simplified the verification command accordingly.

### 3. Missing `LOCK TABLES` privilege in GRANT statement
**What was wrong:** The GRANT statement was missing the `LOCK TABLES` privilege, which is recommended in Drupal's official documentation and is needed by `mysqldump` (used by `drush sql:dump`, which the post demonstrates later).
**What was changed:** Added `LOCK TABLES` to the GRANT statement.

## Review Notes
- `innodb_log_file_size` is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`. The setting still works in current MySQL 8.0.x versions but may be removed in a future release. Since the post targets "MySQL 8.0+" without a specific minor version, this is not an error today but should be revisited if the post is updated.
- The `settings.php` example uses a plaintext password. For production deployments, consider referencing environment variables or a secrets manager, though this is a style choice rather than a technical error.
