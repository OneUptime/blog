# Validation Summary: How to Use MySQL Enterprise Firewall

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Enterprise Edition 8.0+
- MySQL Enterprise Firewall plugin
- SQL stored procedures for firewall management

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Enterprise Firewall (https://dev.mysql.com/doc/refman/8.0/en/firewall.html)
- MySQL 8.0 Reference Manual: Firewall Installation (https://dev.mysql.com/doc/refman/8.0/en/firewall-installation.html)
- MySQL 8.0 Reference Manual: Firewall Usage (https://dev.mysql.com/doc/refman/8.0/en/firewall-usage.html)
- MySQL 8.0 Reference Manual: Firewall Reference (https://dev.mysql.com/doc/refman/8.0/en/firewall-reference.html)

## Issues Found
1. **Incorrect mode count**: The text under "Operating Modes" stated "three modes per user" but the accompanying table correctly listed four modes (OFF, RECORDING, PROTECTING, DETECTING). Changed "three" to "four" to match the table.

## Review Notes
- MySQL 8.0.23+ introduced group profiles (`sp_set_firewall_group_mode`, `firewall_group_allowlist`) as a more flexible alternative to the per-user profiles shown in this post. The user-profile approach documented here remains valid but the group-profile feature may be worth covering in a future update.
- The `SUPER` privilege mentioned in prerequisites is deprecated as of MySQL 8.0.x in favor of fine-grained privileges like `FIREWALL_ADMIN`. The post correctly lists both, which is reasonable for broader compatibility.
- The `mysql.firewall_whitelist` table name uses the legacy "whitelist" terminology; MySQL has been transitioning toward "allowlist" terminology in newer documentation, but the actual table/view names remain unchanged in the schema.
