# How to Query INFORMATION_SCHEMA.PLUGINS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Plugin, Database Administration, Security

Description: Learn how to query INFORMATION_SCHEMA.PLUGINS in MySQL to list installed plugins, their status, type, and library file information.

---

## What Is INFORMATION_SCHEMA.PLUGINS?

The `INFORMATION_SCHEMA.PLUGINS` table provides metadata about plugins installed on the MySQL server. Plugins extend MySQL's functionality and cover areas such as storage engines, authentication, full-text search, auditing, and more. Each row represents one plugin and includes its name, type, status, and the shared library file it was loaded from.

This view is equivalent to `SHOW PLUGINS` but is more flexible for scripting and filtering.

## Columns in PLUGINS

- `PLUGIN_NAME` - the plugin identifier
- `PLUGIN_VERSION` - the plugin version string
- `PLUGIN_STATUS` - `ACTIVE`, `INACTIVE`, `DISABLED`, or `DELETING`
- `PLUGIN_TYPE` - category (e.g., `STORAGE ENGINE`, `AUTHENTICATION`, `AUDIT`, `FTPARSER`)
- `PLUGIN_TYPE_VERSION` - version of the plugin type API
- `PLUGIN_LIBRARY` - shared library filename (NULL for built-in plugins)
- `PLUGIN_LIBRARY_VERSION` - version of the library
- `PLUGIN_AUTHOR` - author of the plugin
- `PLUGIN_DESCRIPTION` - brief description
- `PLUGIN_LICENSE` - license type
- `LOAD_OPTION` - how the plugin was loaded (`ON`, `OFF`, `FORCE`, `FORCE_PLUS_PERMANENT`)

## List All Active Plugins

```sql
SELECT
    PLUGIN_NAME,
    PLUGIN_TYPE,
    PLUGIN_STATUS,
    PLUGIN_LIBRARY
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_STATUS = 'ACTIVE'
ORDER BY PLUGIN_TYPE, PLUGIN_NAME;
```

## Find All Authentication Plugins

```sql
SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS,
    PLUGIN_DESCRIPTION
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_TYPE = 'AUTHENTICATION'
ORDER BY PLUGIN_NAME;
```

## Find Storage Engine Plugins

```sql
SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS,
    PLUGIN_LIBRARY
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_TYPE = 'STORAGE ENGINE'
ORDER BY PLUGIN_NAME;
```

## Check if a Specific Plugin Is Loaded

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';
```

## Find Dynamically Loaded vs Built-In Plugins

Built-in plugins have NULL for `PLUGIN_LIBRARY`:

```sql
SELECT
    PLUGIN_NAME,
    PLUGIN_TYPE,
    CASE
        WHEN PLUGIN_LIBRARY IS NULL THEN 'Built-in'
        ELSE CONCAT('Dynamic: ', PLUGIN_LIBRARY)
    END AS load_type
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_STATUS = 'ACTIVE'
ORDER BY load_type, PLUGIN_NAME;
```

## Audit Inactive or Disabled Plugins

```sql
SELECT
    PLUGIN_NAME,
    PLUGIN_STATUS,
    PLUGIN_TYPE
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_STATUS != 'ACTIVE'
ORDER BY PLUGIN_STATUS, PLUGIN_NAME;
```

## Install and Verify a Plugin

Install the validate_password plugin (MySQL 8.0+ ships it as a component, but older versions use the plugin):

```sql
INSTALL PLUGIN validate_password SONAME 'validate_password.so';

-- Verify installation
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'validate_password';
```

## Uninstall a Plugin

```sql
UNINSTALL PLUGIN validate_password;
```

The row disappears from `INFORMATION_SCHEMA.PLUGINS` after successful uninstallation.

## Summary

`INFORMATION_SCHEMA.PLUGINS` is the authoritative source for understanding what extensions are running on your MySQL server. Use it to audit authentication plugins for security, verify storage engine availability, and track which dynamically loaded components might be consuming resources or introducing security considerations.
