# How to Use MySQL Shell Upgrade Checker Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Shell, Upgrade, Migration, Compatibility

Description: Learn how to use MySQL Shell's util.checkForServerUpgrade() to assess MySQL upgrade compatibility and identify issues before migrating to a newer version.

---

## Introduction

Before upgrading a MySQL server, it is critical to check for compatibility issues that could prevent the upgrade or cause problems after migration. MySQL Shell provides `util.checkForServerUpgrade()`, which scans the server configuration, schemas, and user accounts for known incompatibilities with a target MySQL version. It generates a detailed report with issue severity levels.

## Basic Usage

Connect to the MySQL instance and run the upgrade checker:

```javascript
util.checkForServerUpgrade()
```

By default, this checks compatibility with the latest available MySQL version. You can specify a target version:

```javascript
util.checkForServerUpgrade({targetVersion: "8.4.0"})
```

## Running Without a Live Connection

You can check a remote server by providing connection details:

```javascript
util.checkForServerUpgrade('root@myserver:3306', {targetVersion: "8.4.0"})
```

## Output Format

The checker produces a structured report with three severity levels:

- **Error** - must be fixed before upgrading; upgrade will fail
- **Warning** - should be reviewed; may cause behavior changes
- **Notice** - informational; no action required

Sample output:

```text
MySQL Shell Upgrade Check Utility
====================================

Checking compatibility with MySQL Server 8.4.0...

1) Issues with tables using removed features
  Description: The following tables use features that are not supported in 8.4.0
  More Information: https://dev.mysql.com/doc/...

  mydb.old_table - uses pre-5.6.4 temporal type for column 'created_at'

2) Usage of removed functions
  Found 3 occurrences

3) Non-native partitioning
  No issues found.
```

## Saving the Report to a File

You can get JSON output by setting the `outputFormat` option, then redirect it to a file from the command line:

```bash
mysqlsh root@localhost -e "util.checkForServerUpgrade({targetVersion: '8.0.40', outputFormat: 'JSON'})" > /tmp/upgrade_report.json
```

Or within an interactive MySQL Shell session, use the `outputFormat` option and copy the output:

```javascript
util.checkForServerUpgrade({
  targetVersion: "8.0.40",
  outputFormat: "JSON"
})
```

The JSON format is useful for automated processing or integration with CI/CD pipelines.

## Checking Specific Issues

The upgrade checker runs many individual checks, including:

- Reserved keywords that conflict with new MySQL versions
- Tables using deprecated or removed storage engines
- Views, stored procedures, and functions using removed syntax
- Character set and collation changes
- Removed SQL modes
- Old authentication plugins

Example check for old authentication plugins:

```sql
SELECT user, host, plugin FROM mysql.user WHERE plugin = 'mysql_native_password';
```

If users still use `mysql_native_password`, you need to migrate them before upgrading to MySQL 8.4:

```sql
ALTER USER 'myuser'@'%' IDENTIFIED WITH caching_sha2_password BY 'new_password';
```

## Automating Checks with a Python Script

You can automate the upgrade check by invoking MySQL Shell from a Python script:

```python
import json
import subprocess

result = subprocess.run(
    ["mysqlsh", "root@localhost", "-e",
     "util.check_for_server_upgrade({'targetVersion': '8.4.0', 'outputFormat': 'JSON'})"],
    capture_output=True, text=True
)

report = json.loads(result.stdout)
errors = [c for c in report["checksPerformed"] if c["status"] == "ERROR"]
print(f"Found {len(errors)} blocking errors")
```

## Resolving Common Issues

For tables with incompatible row formats:

```sql
ALTER TABLE mydb.old_table ROW_FORMAT=DYNAMIC;
```

For views using removed functions, update the view definition:

```sql
CREATE OR REPLACE VIEW mydb.my_view AS
SELECT id, new_function(col) AS result FROM base_table;
```

## Summary

`util.checkForServerUpgrade()` is an essential first step before any MySQL version upgrade. It scans your server for incompatibilities and produces a prioritized report of errors, warnings, and notices. Always run it against a copy of production data, resolve all errors, review warnings, and re-run until the report is clean before proceeding with the actual upgrade.
