# Validation Summary: How to Use MySQL with WordPress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB engine, configuration, user management, optimization)
- WordPress (wp-config.php, core database tables: wp_posts, wp_postmeta, wp_options)
- PHP (WordPress configuration constants)
- SQL (DDL, DML, information_schema queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — GRANT statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Server System Variables (innodb_buffer_pool_size, innodb_flush_method, character_set_server, etc.): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — InnoDB Configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — information_schema.processlist: https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual — information_schema.tables: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual — information_schema.statistics: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- WordPress Developer Resources — Editing wp-config.php: https://developer.wordpress.org/advanced-administration/wordpress/wp-config/
- WordPress Developer Resources — Database Description: https://developer.wordpress.org/advanced-administration/before-install/creating-database/

## Issues Found
1. **Remote user GRANT missing privileges**: The GRANT statement for the remote WordPress user (`'wordpress_user'@'10.0.1.50'`) was missing `CREATE TEMPORARY TABLES` and `LOCK TABLES` privileges that were correctly included in the local user GRANT. WordPress requires these privileges for certain operations (e.g., plugin updates, imports, some caching plugins). Fixed by adding the two missing privilege types to match the local user's grants.

## Review Notes
- The `innodb_buffer_pool_size` comment recommends 70-80% of available RAM. This is standard advice for dedicated database servers. On shared servers where MySQL, PHP-FPM, and a web server all run on the same host, a lower percentage (40-60%) would be more appropriate. The post does not distinguish between these scenarios, but the advice is not incorrect for the dedicated DB server case.
- The `DB_COLLATE` setting in wp-config.php is set to `utf8mb4_unicode_ci`. WordPress documentation recommends leaving `DB_COLLATE` empty so MySQL assigns the collation automatically. Setting it explicitly is not wrong and works correctly, but readers should be aware of the WordPress recommendation.
- WordPress 6.6+ changed the `wp_options.autoload` column values from `'yes'`/`'no'` to `'on'`/`'off'`/`'auto-on'`/`'auto-off'`. The query `WHERE autoload = 'yes'` is correct for pre-6.6 installations and still works for backward-compatible rows, but on newer WordPress installations some autoloaded options may use `'on'` instead of `'yes'`. A more future-proof query would use `WHERE autoload IN ('yes', 'on', 'auto-on', 'auto')`.
- All SQL syntax is valid MySQL. All PHP wp-config.php constants are correct. All MySQL server variables use valid names and reasonable values. The information_schema queries reference correct table and column names.
