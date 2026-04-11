# How to Install and Uninstall MySQL Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Plugin, Installation, Administration, Extension

Description: Learn the step-by-step process to install, verify, and uninstall MySQL plugins and components using SQL commands and configuration files.

---

Installing and uninstalling MySQL plugins is a straightforward process once you understand the plugin directory, the `INSTALL PLUGIN` and `UNINSTALL PLUGIN` statements, and how to persist plugin loading across server restarts using `my.cnf`.

## Locating the Plugin Directory

Before installing a plugin, confirm the plugin directory location:

```sql
SHOW VARIABLES LIKE 'plugin_dir';
```

Common paths:
- Linux: `/usr/lib/mysql/plugin/` or `/usr/lib64/mysql/plugin/`
- macOS (Homebrew): `/usr/local/lib/mysql/plugin/`
- Windows: `C:\Program Files\MySQL\MySQL Server 8.0\lib\plugin\`

List available plugins not yet installed:

```bash
ls /usr/lib/mysql/plugin/*.so
```

## Installing a Plugin

Install the `validate_password` plugin dynamically:

```sql
INSTALL PLUGIN validate_password SONAME 'validate_password.so';
```

Install the `connection_control` plugin:

```sql
INSTALL PLUGIN CONNECTION_CONTROL SONAME 'connection_control.so';
INSTALL PLUGIN CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS SONAME 'connection_control.so';
```

Some plugins consist of multiple components registered from the same library file.

## Verifying Installation

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME IN ('validate_password', 'CONNECTION_CONTROL')
ORDER BY PLUGIN_NAME;
```

Expected output:

```text
+--------------------+---------------+-------------------+
| PLUGIN_NAME        | PLUGIN_STATUS | PLUGIN_TYPE       |
+--------------------+---------------+-------------------+
| CONNECTION_CONTROL | ACTIVE        | AUDIT             |
| validate_password  | ACTIVE        | VALIDATE PASSWORD |
+--------------------+---------------+-------------------+
```

## Installing MySQL 8.0 Components

MySQL 8.0 introduced a newer component system:

```sql
INSTALL COMPONENT 'file://component_validate_password';
INSTALL COMPONENT 'file://component_log_sink_json';
INSTALL COMPONENT 'file://component_log_filter_dragnet';
```

Components are stored in the `mysql.component` system table and persist automatically - no `my.cnf` entry needed to reload them after a restart.

## Uninstalling a Plugin

Remove a dynamically installed plugin:

```sql
UNINSTALL PLUGIN validate_password;
```

The plugin is deactivated immediately for all connections. Its shared library file remains in the plugin directory but is no longer loaded.

If a plugin was loaded via `my.cnf` with `plugin-load-add`, also remove that line to prevent it from reloading on the next restart.

## Uninstalling a Component

```sql
UNINSTALL COMPONENT 'file://component_validate_password';
```

## Persisting Plugin Loading in my.cnf

Plugins installed with `INSTALL PLUGIN` persist in the `mysql.plugin` table and reload automatically. If you prefer to manage this through configuration explicitly:

```ini
[mysqld]
plugin-load-add = validate_password.so
plugin-load-add = connection_control.so
```

## Controlling Plugin Activation at Startup

Control how a plugin is activated at startup without uninstalling it:

```ini
[mysqld]
validate_password = FORCE_PLUS_PERMANENT
```

`FORCE_PLUS_PERMANENT` forces the plugin to load and prevents it from being uninstalled while the server is running. Use `OFF` to disable a plugin at startup, or `FORCE` to require successful plugin initialization (the server will not start if the plugin fails to load).

## Troubleshooting Failed Installation

If installation fails with "Can't open shared library":

1. Confirm the `.so` file exists in the plugin directory
2. Check file permissions (`chmod 755 plugin.so`)
3. Verify SELinux or AppArmor is not blocking access
4. Check the error log for details

```bash
sudo tail -n 50 /var/log/mysql/error.log
```

## Summary

MySQL plugin installation uses `INSTALL PLUGIN` with the library filename for dynamic plugins, and `INSTALL COMPONENT` for the MySQL 8.0 component framework. Verify successful installation through `information_schema.PLUGINS`, and uninstall with `UNINSTALL PLUGIN` when no longer needed. Components in MySQL 8.0 persist automatically in `mysql.component`, while older plugins persist in `mysql.plugin`.
