# Validation Summary: What Is the MySQL Enterprise Firewall

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Firewall plugin
- SQL (stored procedures, INFORMATION_SCHEMA queries)

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Enterprise Firewall — https://dev.mysql.com/doc/refman/8.0/en/firewall.html
- MySQL 8.0 Reference Manual: Installing or Uninstalling MySQL Enterprise Firewall — https://dev.mysql.com/doc/refman/8.0/en/firewall-installation.html
- MySQL 8.0 Reference Manual: Using MySQL Enterprise Firewall — https://dev.mysql.com/doc/refman/8.0/en/firewall-usage.html
- MySQL 8.0 Reference Manual: MySQL Enterprise Firewall Reference — https://dev.mysql.com/doc/refman/8.0/en/firewall-reference.html

## Issues Found

1. **Wrong firewall mode name "LEARNING"**: The post used "LEARNING" throughout, but the correct MySQL Enterprise Firewall mode name is "RECORDING". Changed all occurrences of LEARNING to RECORDING, including the section heading.

2. **Wrong plugin library name**: The post used `mysql_firewall.so` as the shared library name in INSTALL PLUGIN statements. The correct library name is `firewall.so`. Fixed all three INSTALL PLUGIN commands.

3. **Invalid SHOW PLUGINS syntax**: The post used `SHOW PLUGINS LIKE 'MYSQL_FIREWALL%'` but `SHOW PLUGINS` does not support a `LIKE` clause. Replaced with a proper query against `INFORMATION_SCHEMA.PLUGINS` with a `WHERE PLUGIN_NAME LIKE` filter.

4. **Non-existent stored procedure `sp_firewall_whitelist_add`**: This stored procedure does not exist in MySQL Enterprise Firewall. The correct way to add manual rules is to INSERT into `mysql.firewall_whitelist` and then call `mysql.sp_reload_firewall_rules()` to reload the rules into memory. Fixed the example accordingly.

5. **Non-existent stored procedure `sp_firewall_whitelist_reset`**: This stored procedure does not exist. The correct way to reset an account's allowlist is to call `mysql.sp_set_firewall_mode('user', 'RESET')`, which clears all rules and sets the mode to OFF. Fixed the example and added a note about re-enabling RECORDING afterward.

6. **Incorrect error code 1289**: The post claimed blocked statements return error 1289, but MySQL error 1289 is `ER_OPTION_PREVENTS_STATEMENT`, which is unrelated to the firewall. Replaced with a generic `ERROR HY000` representation that matches the actual firewall blocking error.

7. **Wrong log destination for DETECTING mode**: The post stated violations in DETECTING mode are written to the "MySQL general log." They are actually written to the MySQL error log. Fixed the reference.

8. **Incomplete mode description**: The post stated the firewall operates in "two modes: LEARNING and PROTECTING" but the firewall actually has several modes (OFF, RECORDING, PROTECTING, DETECTING, RESET). The DETECTING mode was mentioned later but contradicted the "two modes" claim. Updated to say "several modes" and briefly listed the three main operating modes, with DETECTING explained in the How It Works section.

## Review Notes
- The post focuses on account-level profiles (the `sp_set_firewall_mode` interface). MySQL 8.0.23+ also introduced group profiles via `sp_set_firewall_group_mode()` and related procedures, which allow firewall rules to be shared across multiple accounts. This could be a useful addition in a future update.
- The post correctly notes that MySQL Enterprise Firewall is only available in MySQL Enterprise Edition, which is an important caveat for readers.
