# How to Configure MySQL Server SQL Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, Configuration, Strict Mode, Compatibility

Description: Learn how to configure MySQL server SQL mode to control data validation, error handling, and compatibility behavior for your application.

---

MySQL SQL modes control how the server handles SQL syntax and data validation. They determine whether invalid data values trigger errors or are silently adjusted, and they affect compatibility with other database systems. Choosing the right SQL mode for your environment prevents subtle data corruption and application bugs.

## Checking the Current SQL Mode

```sql
SELECT @@sql_mode;
```

Or use the `SHOW VARIABLES` syntax:

```sql
SHOW VARIABLES LIKE 'sql_mode';
```

MySQL 8.0 ships with a default SQL mode that includes several strict settings:

```text
ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

## Setting SQL Mode at Runtime

Change the global SQL mode for all new connections:

```sql
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
```

Change it for the current session only:

```sql
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
```

## Persisting SQL Mode in my.cnf

Add the desired mode to the `[mysqld]` section:

```ini
[mysqld]
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

Restart MySQL to apply the change:

```bash
sudo systemctl restart mysql
```

## Common SQL Mode Values

| Mode | Effect |
|------|--------|
| `STRICT_TRANS_TABLES` | Reject invalid values for transactional tables |
| `ONLY_FULL_GROUP_BY` | Disallow non-aggregated columns not in GROUP BY |
| `NO_ZERO_IN_DATE` | Reject dates with zero month or day |
| `NO_ZERO_DATE` | Reject the literal zero date `0000-00-00` |
| `ERROR_FOR_DIVISION_BY_ZERO` | Produce a warning (or error with strict mode) for division by zero |
| `NO_ENGINE_SUBSTITUTION` | Error if requested storage engine is unavailable |
| `ANSI` | Combines settings for ANSI SQL compliance |
| `TRADITIONAL` | Error on invalid data values, similar to traditional databases |

## Adding or Removing a Single Mode

Instead of replacing the entire mode string, use `CONCAT` to add a mode:

```sql
SET GLOBAL sql_mode = CONCAT(@@GLOBAL.sql_mode, ',NO_ZERO_DATE');
```

To remove one mode while keeping the others, use `REPLACE`:

```sql
SET GLOBAL sql_mode = REPLACE(@@GLOBAL.sql_mode, 'ONLY_FULL_GROUP_BY,', '');
```

## Checking the Effect of a Mode Change

Test your application's queries in a session with the target SQL mode before applying it globally:

```sql
SET SESSION sql_mode = 'TRADITIONAL';

-- This will now error instead of silently inserting '0000-00-00'
INSERT INTO events (event_date) VALUES ('2026-02-30');
```

## SQL Mode and Application Migrations

When migrating from MySQL 5.7 to 8.0, the default SQL mode changed with the removal of `NO_AUTO_CREATE_USER` (which was deprecated in 5.7). Applications that used custom lenient SQL modes in 5.7 may encounter stricter defaults in 8.0. Check for:

- Queries that relied on implicit `GROUP BY` behavior
- Inserts with zero dates
- Division by zero in calculations

## Summary

MySQL SQL modes give you fine-grained control over data validation strictness and compatibility behavior. Start with MySQL 8.0 defaults in development, test your application against those modes, and avoid disabling strict modes in production. If you need to adjust for legacy compatibility, narrow the change to only the specific mode flags required rather than clearing the entire `sql_mode` variable.
