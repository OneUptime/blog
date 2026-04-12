# How to Use VERSION() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, VERSION Function, Information Functions, Administration

Description: Learn how to use the VERSION() function in MySQL to retrieve the server version string and write version-aware SQL queries and scripts.

---

## What is VERSION()

MySQL's `VERSION()` function returns a string describing the version of the MySQL server. It is useful for version checks in scripts, stored procedures, and application startup validation.

Syntax:

```sql
VERSION()
```

## Basic Usage

```sql
SELECT VERSION();
-- Output (example): 8.0.36

-- Also accessible as a system variable
SELECT @@version;
SELECT @@GLOBAL.version;
```

## Interpreting the Version String

The version string format is:

```text
major.minor.patch[-distribution_info]
```

Examples:

```text
8.0.36
8.4.0
5.7.44
8.0.36-0ubuntu0.22.04.1
8.0.36-percona
```

## Checking for Minimum Version

To programmatically verify the MySQL version in a script:

```sql
-- Check if version is at least 8.0
SELECT
  VERSION() AS current_version,
  CASE
    WHEN CAST(SUBSTRING_INDEX(VERSION(), '.', 1) AS UNSIGNED) >= 8 THEN 'MySQL 8.x or newer'
    WHEN CAST(SUBSTRING_INDEX(VERSION(), '.', 1) AS UNSIGNED) = 5 THEN 'MySQL 5.x'
    ELSE 'Unknown version'
  END AS version_series;
```

## Extracting Major and Minor Version Numbers

```sql
SELECT
  VERSION() AS full_version,
  CAST(SUBSTRING_INDEX(VERSION(), '.', 1) AS UNSIGNED) AS major_version,
  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(VERSION(), '.', 2), '.', -1) AS UNSIGNED) AS minor_version;
```

## VERSION() in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE check_version()
BEGIN
  DECLARE v_version VARCHAR(100);
  SET v_version = VERSION();

  IF CAST(SUBSTRING_INDEX(v_version, '.', 1) AS UNSIGNED) < 8 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'MySQL 8.0 or higher is required';
  ELSE
    SELECT CONCAT('MySQL version OK: ', v_version) AS status;
  END IF;
END //
DELIMITER ;

CALL check_version();
```

## Using VERSION() in Application Code

In Python:

```python
cursor.execute("SELECT VERSION()")
version = cursor.fetchone()[0]
print(f"MySQL Server version: {version}")

major = int(version.split('.')[0])
if major < 8:
    raise RuntimeError("This application requires MySQL 8.0 or higher")
```

In Node.js:

```javascript
const [rows] = await conn.execute('SELECT VERSION() AS version');
const version = rows[0].version;
console.log('MySQL version:', version);

const major = parseInt(version.split('.')[0]);
if (major < 8) {
    throw new Error('MySQL 8.0 or higher required');
}
```

## Related Version-Checking Methods

```sql
-- View full server info
SHOW VARIABLES LIKE 'version%';
-- Shows: version, version_comment, version_compile_machine, version_compile_os

-- System variables
SELECT @@version_comment;   -- e.g.: MySQL Community Server - GPL
SELECT @@version_compile_os; -- e.g.: Linux
```

## Detecting MariaDB vs MySQL

MariaDB uses the same driver as MySQL but reports a different version string:

```sql
SELECT VERSION();
-- MariaDB output: 10.11.4-MariaDB
-- MySQL output:   8.0.36
```

In application code:

```python
version_str = cursor.fetchone()[0]
is_mariadb = 'MariaDB' in version_str
```

## Summary

`VERSION()` returns the MySQL server version as a string, equivalent to `@@version`. Use it to write version-aware queries, validate minimum version requirements in stored procedures and application startup checks, and distinguish between MySQL and MariaDB distributions. Parse the major/minor version using `SUBSTRING_INDEX()` for numeric comparisons.
