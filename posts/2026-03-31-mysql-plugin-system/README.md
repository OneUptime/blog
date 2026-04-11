# How to Configure MySQL Plugin System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Plugin, Configuration, Extension, Installation

Description: Learn how the MySQL plugin system works, how to install and configure plugins, and how it differs from the newer component infrastructure introduced in MySQL 8.0.

---

## Overview

MySQL's plugin system allows extending server functionality through dynamically loadable shared libraries. Plugins provide authentication methods, storage engines, audit logging, full-text parsers, and more. While MySQL 8.0 introduced a newer component infrastructure, the plugin system remains widely used for many core features.

## Plugin Types

MySQL supports several categories of plugins:

```text
Storage Engine     - InnoDB, MyISAM, MEMORY, ARCHIVE
Authentication     - auth_socket, caching_sha2_password, ldap_auth
Audit              - audit_log (Enterprise)
Full-text Parser   - Custom tokenizers for FULLTEXT indexes
Information Schema - Custom INFORMATION_SCHEMA tables
Replication        - Semisync replication plugins
UDF                - User-defined functions
Password Validation- validate_password (legacy plugin)
Connection Control - connection_control
```

## Listing Available and Installed Plugins

```sql
-- View all plugins (built-in and loaded)
SHOW PLUGINS;

-- View only active plugins with details
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE, PLUGIN_LIBRARY
FROM information_schema.PLUGINS
WHERE PLUGIN_STATUS = 'ACTIVE'
ORDER BY PLUGIN_TYPE, PLUGIN_NAME;

-- Find the plugin directory
SHOW VARIABLES LIKE 'plugin_dir';
```

## Installing a Plugin at Runtime

```sql
-- Install a plugin from the plugin directory
INSTALL PLUGIN connection_control
  SONAME 'connection_control.so';

-- Install a plugin and verify
INSTALL PLUGIN validate_password SONAME 'validate_password.so';

SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';
```

## Installing Plugins via my.cnf

For plugins that must load before the server accepts connections, configure them in `my.cnf`:

```text
[mysqld]
# Load one plugin
plugin-load-add=connection_control.so

# Load multiple plugins
plugin-load-add=connection_control.so
plugin-load-add=validate_password.so

# Or load all at once (semicolon-separated)
plugin-load=connection_control.so;validate_password.so
```

## Configuring Plugin Variables

Plugin variables are configured the same way as built-in server variables:

```sql
-- View all plugin-provided variables
SHOW VARIABLES LIKE 'connection_control%';
SHOW VARIABLES LIKE 'validate_password%';

-- Configure plugin settings
SET GLOBAL connection_control_failed_connections_threshold = 5;
SET GLOBAL validate_password_policy = 'MEDIUM';
```

Persist settings across restarts:

```sql
SET PERSIST connection_control_failed_connections_threshold = 5;
SET PERSIST validate_password_policy = 'MEDIUM';
```

## Uninstalling a Plugin

```sql
-- Uninstall at runtime
UNINSTALL PLUGIN validate_password;

-- Verify removal
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';
-- Should return no rows
```

## Plugin vs Component Decision Guide

```text
Use a Plugin when:
  - The feature only has a plugin implementation (e.g., connection_control)
  - You need MySQL 5.7 compatibility
  - The plugin is a storage engine

Use a Component when:
  - Both plugin and component versions exist (use component for MySQL 8.0)
  - Example: validate_password (use component_validate_password in 8.0)
  - Better dependency management is needed
```

## Troubleshooting Plugin Loading Errors

```bash
# Common error: Plugin not found
# ERROR 1126 (HY000): Can't open shared library 'plugin_name.so'

# Check that the .so file exists in the plugin directory
ls -la /usr/lib/mysql/plugin/ | grep connection_control

# Check file permissions
sudo chmod 755 /usr/lib/mysql/plugin/connection_control.so
sudo chown mysql:mysql /usr/lib/mysql/plugin/connection_control.so
```

## Summary

The MySQL plugin system provides a mature, widely-supported mechanism for extending server capabilities through dynamically loadable shared libraries. Install plugins at runtime with `INSTALL PLUGIN` or permanently via `plugin-load-add` in `my.cnf`. Configure plugin variables using `SET GLOBAL` or `SET PERSIST` for persistence. For MySQL 8.0 deployments, prefer the newer component infrastructure when both plugin and component versions of a feature are available, as components offer better isolation and dependency management.
