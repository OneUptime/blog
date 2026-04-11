# Validation Summary: How to Use MySQL with Magento

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- MariaDB 10.6+
- Magento 2 (Adobe Commerce)
- InnoDB storage engine
- PHP (pdo_mysql, mysqli extensions)

## Sources Consulted
- Adobe Commerce System Requirements: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements
- Adobe Commerce MySQL Guidelines: https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/prerequisites/database-server/mysql
- Adobe Commerce env.php Reference: https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/files/config-reference-envphp
- MySQL 8.0 InnoDB Configuration Reference: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- Adobe Commerce Split Database Deprecation: https://experienceleague.adobe.com/en/docs/commerce-operations/configuration-guide/storage/split-db/multi-master
- Magento 2 CLI Command Reference: https://experienceleague.adobe.com/en/docs/commerce-operations/reference/commerce-on-premises

## Issues Found

### 1. Incorrect MariaDB version requirement
- **What was wrong:** The post stated Magento 2 requires "MariaDB 10.4+". MariaDB 10.4 support was dropped in Magento 2.4.6. Current versions (2.4.6+, 2.4.7+) require MariaDB 10.6 as the minimum.
- **What was changed:** Updated "MariaDB 10.4+" to "MariaDB 10.6+".
- **Why:** MariaDB 10.4 is no longer a supported database for current Magento 2 releases, and readers following this guide could end up with an unsupported configuration.

### 2. Non-existent `log:clean` CLI command
- **What was wrong:** The post included `php bin/magento log:clean --days 30` as a built-in Magento 2 CLI command. This command does not exist in Magento 2. It was a Magento 1 feature (`php -f shell/log.php clean`).
- **What was changed:** Replaced the non-existent CLI command with the correct approach: configuring automatic log cleaning via the Magento Admin Panel (Stores > Configuration > Advanced > System > Log Cleaning).
- **Why:** Running the original command would produce a "command not found" error, confusing readers.

### 3. Inaccurate description mentioning "split database patterns"
- **What was wrong:** The post description referenced "split database patterns" but the post does not cover this topic at all. Additionally, the split database feature was deprecated in Magento 2.4.2.
- **What was changed:** Replaced "split database patterns" with "log table maintenance" in the description to accurately reflect the post's content.
- **Why:** The description should match the actual content of the post.

## Review Notes
- The `innodb_log_file_size` variable was deprecated in MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. The setting still works in MySQL 8.0.x but will not be available in MySQL 8.4+. Authors may want to add a note about this in a future update.
- The `innodb_buffer_pool_instances` default is 8 (when buffer pool >= 1GB) in MySQL 8.0. Setting it to 4 is valid but lower than the default; this is a tuning choice, not an error.
- The env.php snippet is minimal but functional. A production configuration typically also includes `'engine' => 'innodb'` and `'initStatements' => 'SET NAMES utf8;'`, but Magento fills in sensible defaults for these.
- The `utf8mb4_unicode_ci` collation in the database creation SQL is a sound choice for Magento 2 on MySQL 8.0.
