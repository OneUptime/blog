# Validation Summary: How to Set Up Zabbix for Enterprise Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Zabbix 6.4 (server, agent2, frontend)
- Ubuntu 22.04 LTS
- MySQL 8.0
- Apache HTTP Server 2.4 with PHP
- Zabbix JSON-RPC API
- UFW firewall
- Zabbix webhook media types (JavaScript runtime)

## Sources Consulted
- Zabbix 6.4 documentation — installation from packages: https://www.zabbix.com/documentation/6.4/en/manual/installation/install_from_packages/debian_ubuntu
- Zabbix 6.4 API reference — `user.login`: https://www.zabbix.com/documentation/6.4/en/manual/api/reference/user/login
- Zabbix 6.4 API reference — `host.create`: https://www.zabbix.com/documentation/6.4/en/manual/api/reference/host/create
- Zabbix 6.4 server configuration parameters: https://www.zabbix.com/documentation/6.4/en/manual/appendix/config/zabbix_server
- Zabbix 6.4 agent2 configuration parameters: https://www.zabbix.com/documentation/6.4/en/manual/appendix/config/zabbix_agent2
- Zabbix 6.4 webhook media type: https://www.zabbix.com/documentation/6.4/en/manual/config/notifications/media/webhook
- Zabbix package repository listing: https://repo.zabbix.com/zabbix/6.4/ubuntu/pool/main/z/zabbix-release/
- MySQL 8.0 Keywords and Reserved Words: https://dev.mysql.com/doc/refman/8.0/en/keywords.html

## Issues Found

1. **MySQL reserved-word syntax error in "Monitoring Database Performance" section.** The original query used `SELECT COUNT(*) as rows ... FROM history;`. `ROWS` became a reserved keyword in MySQL 8.0.2 (used in window-function clauses), so this query fails on Ubuntu 22.04's default MySQL 8.0 with a syntax error near `rows`. Changed the alias from `rows` to `row_count` to avoid needing backtick quoting and match standard practice.

## Review Notes

- **Zabbix 6.4 lifecycle:** Zabbix 6.4 reached full end-of-life on 31 May 2024 and is no longer receiving updates. As of this validation (May 2026), the current LTS is Zabbix 7.0 LTS (full support through 2029), and Zabbix 7.2 / 7.4 are also available. The post's commands and repository URL are correct for 6.4 installations, but readers should be aware that production deployments should generally target the current LTS.
- **Apache 2.2-style access control:** The custom `apache.conf` writes `Order allow,deny` / `Allow from all`. These directives are deprecated in Apache 2.4 (which ships on Ubuntu 22.04) and only work because `mod_access_compat` is enabled by default. The modern equivalent is `Require all granted`. Functional today but a deprecation risk.
- **`always_populate_raw_post_data = -1`:** This PHP INI directive was removed in PHP 7.0 and has no effect on the PHP 8.x that Ubuntu 22.04 ships. `php_value` for unknown directives is silently ignored, so it is harmless but unnecessary.
- **`mod_php.c` IfModule guard:** This matches Zabbix's official `apache.conf`, but if Apache is configured to use PHP-FPM (common modern setup) rather than mod_php, none of the `php_value` directives inside the block will be applied; the PHP timezone would need to be set in `php.ini` or the FPM pool. The post's use of mod_php-only directives is consistent with the upstream Zabbix template.
- **`auth` parameter in API calls:** The `auth` field in the JSON-RPC body works in 6.4 but is deprecated in Zabbix 7.0+ in favor of the `Authorization: Bearer <token>` HTTP header. Correct for the 6.4 version this post targets.
- **Plain-text DB password in `zabbix_server.conf`:** Acceptable per upstream docs (the file should be `chmod 600` and owned by `zabbix:zabbix`, which the package does by default). Zabbix also supports `DBPasswordFile` and HashiCorp Vault integration as more secure alternatives — worth mentioning in a future revision.
- **`history` table query:** The `history` table only stores numeric float items; on a fresh install it may be empty until a float-valued item collects data. Other history tables (`history_uint`, `history_str`, `history_text`, `history_log`) hold the rest. Not incorrect, but readers troubleshooting an empty result should know.
