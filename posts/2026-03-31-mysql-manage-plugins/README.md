# How to Manage MySQL Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Plugin, Administration, Configuration, Extension

Description: Learn how to view, install, configure, and uninstall MySQL plugins including authentication plugins, storage engines, and utility plugins.

---

MySQL's plugin architecture allows extending server functionality by loading shared libraries at runtime. Plugins provide authentication methods, storage engines, full-text parsers, audit logging, and more - without requiring a server recompile.

## Viewing Installed Plugins

List all loaded plugins:

```sql
SHOW PLUGINS;
```

Or query the information schema for more detail:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE, PLUGIN_LIBRARY, PLUGIN_LICENSE
FROM information_schema.PLUGINS
WHERE PLUGIN_STATUS = 'ACTIVE'
ORDER BY PLUGIN_TYPE, PLUGIN_NAME;
```

`PLUGIN_LIBRARY` is NULL for built-in plugins and shows the `.so` or `.dll` filename for dynamically loaded plugins.

## Plugin Types

Common plugin types in MySQL:

| Type | Examples |
|------|---------|
| `STORAGE ENGINE` | InnoDB, MyISAM, MEMORY |
| `AUTHENTICATION` | caching_sha2_password, mysql_native_password |
| `AUDIT` | audit_log (MySQL Enterprise) |
| `VALIDATE PASSWORD` | validate_password |
| `INFORMATION SCHEMA` | InnoDB buffer, compression tables |
| `DAEMON` | Clone plugin, Group Replication, X Plugin |

## Installing a Plugin with INSTALL PLUGIN

Install the `validate_password` plugin:

```sql
INSTALL PLUGIN validate_password SONAME 'validate_password.so';
```

On Windows, use `.dll` instead of `.so`. The plugin file must exist in the MySQL plugin directory.

Find the plugin directory:

```sql
SHOW VARIABLES LIKE 'plugin_dir';
```

## Installing a Component (MySQL 8.0)

MySQL 8.0 uses a newer component system alongside the older plugin system:

```sql
INSTALL COMPONENT 'file://component_validate_password';
INSTALL COMPONENT 'file://component_log_sink_json';
```

List installed components:

```sql
SELECT COMPONENT_URN, COMPONENT_ID
FROM mysql.component;
```

## Configuring Plugin Behavior

After installing a plugin, its system variables become available. Note that the plugin version uses underscore-separated variable names, while the MySQL 8.0 component version uses dot-separated names:

```sql
SHOW VARIABLES LIKE 'validate_password%';
```

Configure variables at runtime for the plugin version (installed with `INSTALL PLUGIN`):

```sql
SET GLOBAL validate_password_policy = 'STRONG';
SET GLOBAL validate_password_length = 12;
```

Or for the component version (installed with `INSTALL COMPONENT`):

```sql
SET GLOBAL validate_password.policy = 'STRONG';
SET GLOBAL validate_password.length = 12;
```

Persist configuration in `my.cnf` (using component variable names for MySQL 8.0):

```ini
[mysqld]
validate_password.policy = STRONG
validate_password.length = 12
```

## Loading Plugins at Startup via my.cnf

Load a plugin automatically on server start:

```ini
[mysqld]
plugin-load-add = validate_password.so
```

For multiple plugins:

```ini
[mysqld]
plugin-load-add = validate_password.so
plugin-load-add = connection_control.so
```

## Disabling a Plugin at Startup

Prevent a plugin from loading without removing its configuration:

```ini
[mysqld]
validate_password = OFF
```

## Checking Plugin Status After Installation

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';
```

`ACTIVE` means the plugin is loaded and operational. `DISABLED` means it was loaded but manually disabled.

## Summary

MySQL plugins extend server capabilities by loading shared libraries at runtime. Use `INSTALL PLUGIN` for the legacy plugin system and `INSTALL COMPONENT` for MySQL 8.0 components. View installed plugins through `SHOW PLUGINS` or `information_schema.PLUGINS`, configure them through system variables, and load them persistently with `plugin-load-add` in `my.cnf`. Always verify the plugin file exists in the plugin directory before attempting installation.
