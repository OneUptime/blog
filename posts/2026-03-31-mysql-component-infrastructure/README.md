# How to Configure MySQL Component Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Component, Plugin, Infrastructure, Configuration

Description: Learn how MySQL 8.0 component infrastructure works, how it differs from the legacy plugin system, and how to install, configure, and manage components.

---

## Overview

MySQL 8.0 introduced a new component infrastructure that replaces the older plugin system for server extensions. Components offer stronger isolation, better dependency management, and a cleaner API. Understanding the difference between plugins and components helps you choose the right extension mechanism and correctly configure server features.

## Components vs. Plugins

```text
Feature            | Plugin         | Component
-------------------+----------------+------------------
API stability      | Less stable    | More stable
Dependency mgmt    | Manual         | Declared & managed
Server coupling    | Tightly coupled| Loosely coupled
Loading mechanism  | INSTALL PLUGIN | INSTALL COMPONENT
Config persistence | Plugin table   | component table
Examples           | validate_password| validate_password,
                   | (plugin), clone  | keyring_file,
                   | audit_log        | log_sink_json
```

## Listing Available and Installed Components

```sql
-- View all installed components
SELECT * FROM mysql.component;

-- Check the plugin directory where component libraries are stored
SHOW VARIABLES LIKE 'plugin_dir';
```

## Installing a Component

```sql
-- Install validate_password component
INSTALL COMPONENT 'file://component_validate_password';

-- Install the log filter dragnet component
INSTALL COMPONENT 'file://component_log_filter_dragnet';

-- Note: Keyring components (e.g., component_keyring_file) must be loaded
-- via a server manifest file, not with INSTALL COMPONENT.

-- Install multiple components
INSTALL COMPONENT
    'file://component_validate_password',
    'file://component_log_sink_json';
```

## Uninstalling a Component

```sql
-- Uninstall a component
UNINSTALL COMPONENT 'file://component_validate_password';

-- Verify it is removed
SELECT * FROM mysql.component
WHERE component_urn = 'file://component_validate_password';
-- Should return empty result
```

## Component Persistence

Installed components are recorded in the `mysql.component` table and automatically reloaded at server startup - no manual configuration in `my.cnf` is required:

```sql
-- Check what is installed (persists across restarts automatically)
SELECT component_id, component_group_id, component_urn
FROM mysql.component;
```

## Configuring Component Variables

Component variables are configured the same way as server variables:

```sql
-- View all component-provided variables
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME LIKE 'validate_password%'
   OR VARIABLE_NAME LIKE 'keyring%';

-- Set a component variable
SET GLOBAL validate_password.policy = 'STRONG';
SET GLOBAL validate_password.length = 12;
```

To persist component variable settings across restarts, use `SET PERSIST`:

```sql
-- Persist setting (written to mysqld-auto.cnf)
SET PERSIST validate_password.policy = 'STRONG';
SET PERSIST validate_password.length = 12;

-- View persisted variables
SELECT * FROM performance_schema.persisted_variables;
```

## Using SET PERSIST for Component Configuration

`SET PERSIST` writes settings to `/var/lib/mysql/mysqld-auto.cnf`, which is read at startup:

```sql
-- Persist multiple settings at once
SET PERSIST validate_password.policy = 'STRONG';
SET PERSIST validate_password.mixed_case_count = 2;
SET PERSIST validate_password.number_count = 2;
SET PERSIST validate_password.special_char_count = 2;

-- Remove a persisted setting
RESET PERSIST validate_password.policy;
```

## Component vs Plugin Loading in my.cnf

```text
[mysqld]
# Load plugin (legacy)
plugin-load-add=connection_control.so

# Components load automatically from mysql.component table
# No my.cnf entry needed for components
```

## Summary

MySQL's component infrastructure provides a more robust and maintainable extension system than the legacy plugin architecture. Components are installed via `INSTALL COMPONENT`, automatically persist in the `mysql.component` table, and reload at startup without `my.cnf` entries. Use `SET PERSIST` to persist component variable settings to `mysqld-auto.cnf`, and monitor installed components via `mysql.component`. When choosing between a plugin and a component for a feature, prefer the component if both options are available in your MySQL version.
