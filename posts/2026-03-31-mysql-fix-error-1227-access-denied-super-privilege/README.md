# How to Fix ERROR 1227 Access Denied for SUPER Privilege in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Privilege, Error, SUPER, Replication

Description: Fix MySQL ERROR 1227 Access denied requiring SUPER or SET_USER_ID privilege by granting the right privilege or removing DEFINER clauses from dump files.

---

MySQL ERROR 1227 appears when importing a dump or creating a stored routine that uses a `DEFINER` clause specifying a different user. The error reads: `ERROR 1227 (42000): Access denied; you need (at least one of) the SUPER or SET_USER_ID privilege(s) for this operation`.

## Why This Happens

When `mysqldump` exports stored procedures, views, triggers, or events, it includes a `DEFINER` clause:

```sql
CREATE DEFINER=`root`@`%` PROCEDURE `my_proc` ()
```

When a non-root user imports this dump, MySQL rejects the statement because the importing user does not have SUPER privilege to define routines as another user.

## Fix 1: Grant the Required Privilege

On MySQL 8.0+, grant `SET_USER_ID` instead of the deprecated SUPER:

```sql
GRANT SET_USER_ID ON *.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

On MySQL 5.7 and earlier:

```sql
GRANT SUPER ON *.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

## Fix 2: Strip DEFINER Clauses from the Dump

The safest approach is to remove DEFINER clauses from the dump file before importing:

```bash
# Remove all DEFINER clauses from a dump file
sed -i 's/DEFINER=[^ ]*//' dump.sql

# More targeted - remove only DEFINER from CREATE statements
sed -i 's/\/\*!50013 DEFINER=[^ ]* SQL SECURITY DEFINER \*\///' dump.sql
```

Or use Perl for a more robust replacement:

```bash
perl -p -i -e 's/\sDEFINER=`[^`]+`@`[^`]+`//g' dump.sql
```

## Fix 3: Export Without DEFINER

Pipe the `mysqldump` output through `sed` to strip DEFINER clauses during export:

```bash
# Export routines without DEFINER
mysqldump --no-tablespaces -u root -p mydb \
  --routines --triggers --events \
  | sed 's/DEFINER=[^ ]*//' > clean_dump.sql
```

## Fix 4: Import with the root User

If you have access to the root account, import the dump as root:

```bash
mysql -u root -p mydb < dump.sql
```

The root user has SUPER privilege and can import DEFINER clauses for any user.

## Fix 5: Change the DEFINER to the Importing User

Replace all DEFINERs with the user you are importing as:

```bash
sed -i "s/DEFINER=[^ ]*/DEFINER=\`app_user\`@\`%\`/g" dump.sql
```

## Verify After Import

After a successful import, check that routines were created correctly:

```sql
SELECT ROUTINE_NAME, DEFINER, ROUTINE_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'mydb';
```

## Cloud Environments

Cloud SQL, RDS, and Azure MySQL do not grant SUPER privilege even to the admin user. Always strip DEFINER clauses before importing dumps into cloud-managed MySQL instances.

## Summary

ERROR 1227 is caused by DEFINER clauses in SQL files that specify a user different from the importing user. The best approach for portability is to strip DEFINER clauses from dump files using `sed` before importing. For cloud environments, this is required because SUPER is never available to end users.
