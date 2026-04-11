# How to Use SHOW PLUGINS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Plugin, Administration

Description: Learn how to use SHOW PLUGINS in MySQL to list installed plugins, check their status, and understand plugin types for server management.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## What Is SHOW PLUGINS

`SHOW PLUGINS` lists all plugins installed in the MySQL server, including their name, status, type, library file, and license. MySQL uses a plugin architecture for many features including storage engines, authentication methods, password validation, audit logging, and full-text search. `SHOW PLUGINS` is the primary way to see what functionality is available on a MySQL instance.

```sql
SHOW PLUGINS;
```

## Basic Usage

```sql
SHOW PLUGINS;
```

```text
+----------------------------+----------+--------------------+------------------------------+---------+
| Name                       | Status   | Type               | Library                      | License |
+----------------------------+----------+--------------------+------------------------------+---------+
| binlog                     | ACTIVE   | STORAGE ENGINE     | NULL                         | GPL     |
| sha256_password            | ACTIVE   | AUTHENTICATION     | NULL                         | GPL     |
| caching_sha2_password      | ACTIVE   | AUTHENTICATION     | NULL                         | GPL     |
| InnoDB                     | ACTIVE   | STORAGE ENGINE     | NULL                         | GPL     |
| MEMORY                     | ACTIVE   | STORAGE ENGINE     | NULL                         | GPL     |
| MyISAM                     | ACTIVE   | STORAGE ENGINE     | NULL                         | GPL     |
| validate_password          | ACTIVE   | VALIDATE PASSWORD  | validate_password.so         | GPL     |
| mysql_native_password      | DISABLED | AUTHENTICATION     | NULL                         | GPL     |
+----------------------------+----------+--------------------+------------------------------+---------+
```

## Output Columns Explained

- **Name**: Plugin name
- **Status**: `ACTIVE` (loaded and working), `INACTIVE` (loaded but not active), `DISABLED` (installed but disabled), or `DELETED` (marked for removal)
- **Type**: Plugin category (`STORAGE ENGINE`, `AUTHENTICATION`, `AUDIT`, `FTPARSER`, `VALIDATE PASSWORD`, `DAEMON`, etc.)
- **Library**: The shared library file (`NULL` for built-in plugins)
- **License**: License type (`GPL`, `PROPRIETARY`, etc.)

## Filtering with information_schema

For more flexible querying, use `information_schema.PLUGINS`:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE, PLUGIN_LIBRARY
FROM information_schema.PLUGINS
ORDER BY PLUGIN_TYPE, PLUGIN_NAME;
```

Filter by type:

```sql
-- See all storage engines
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_TYPE = 'STORAGE ENGINE';

-- See all authentication plugins
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_TYPE = 'AUTHENTICATION';
```

## Checking Specific Plugin Status

```sql
-- Is validate_password enabled?
SELECT PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';

-- Is InnoDB active?
SELECT PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME = 'InnoDB';
```

## Installing a Plugin

```sql
-- Install a plugin from a shared library
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- Verify installation
SHOW PLUGINS;
```

Or install a component (MySQL 8.0+):

```sql
INSTALL COMPONENT 'file://component_validate_password';
```

## Uninstalling a Plugin

```sql
-- Uninstall a dynamic plugin
UNINSTALL PLUGIN plugin_name;

-- Uninstall a component
UNINSTALL COMPONENT 'file://component_validate_password';
```

Built-in plugins cannot be uninstalled - they can only be disabled in the configuration file.

## Checking Available Storage Engines

A common use case is verifying available storage engines:

```sql
-- More detailed storage engine info
SHOW ENGINES;
```

Or via plugins:

```sql
SELECT PLUGIN_NAME AS engine, PLUGIN_STATUS AS status
FROM information_schema.PLUGINS
WHERE PLUGIN_TYPE = 'STORAGE ENGINE'
ORDER BY PLUGIN_NAME;
```

## Disabling a Plugin at Startup

To disable a plugin without uninstalling it, add it to `my.cnf`:

```text
[mysqld]
mysql_native_password=OFF
```

After restarting, `SHOW PLUGINS` will show the plugin status as `DISABLED`.

## Summary

`SHOW PLUGINS` reveals all MySQL plugins including storage engines, authentication methods, and validation components. Check plugin status to verify that required functionality is active before deployment. Use `INSTALL PLUGIN` or `INSTALL COMPONENT` to add new functionality, and query `information_schema.PLUGINS` for programmatic or filtered access to plugin information.
