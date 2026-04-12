# How to Restore a MySQL Database from a mysqldump File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Restore, mysqldump, Disaster Recovery, Administration

Description: Learn how to restore a MySQL database from a mysqldump SQL file, including handling compressed backups and large file restoration tips.

---

## Restoring a mysqldump Backup

A mysqldump backup is a SQL script. Restoring means executing that script with the `mysql` client, which replays all the `CREATE TABLE` and `INSERT` statements.

## Basic Restore Command

```bash
mysql -u root -p your_database < backup.sql
```

If the dump was created with `--databases` or `--all-databases`, it includes `CREATE DATABASE` and `USE` statements, so you do not need to specify the database:

```bash
mysql -u root -p < all_databases.sql
```

## Restoring a Compressed Backup

For `.sql.gz` files, decompress and pipe in one step:

```bash
gunzip < backup_20240510.sql.gz | mysql -u root -p your_database
```

Or:

```bash
zcat backup_20240510.sql.gz | mysql -u root -p your_database
```

## Creating the Target Database First

If the dump does not include `CREATE DATABASE`:

```sql
CREATE DATABASE IF NOT EXISTS your_database
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

```bash
mysql -u root -p your_database < backup.sql
```

## Verifying the Restore

After restoring, verify the data:

```sql
USE your_database;
SHOW TABLES;
SELECT COUNT(*) FROM orders;
```

Compare row counts to what was expected from the source database.

## Restoring a Single Table from a Full Database Dump

If the dump contains multiple tables but you only need one, extract the relevant section:

```bash
# Extract just the orders table from the dump
sed -n '/-- Table structure for table `orders`/,/-- Table structure for/p' backup.sql \
  | head -n -1 > orders_only.sql

mysql -u root -p your_database < orders_only.sql
```

A cleaner approach: use `--tables` when making the backup:

```bash
mysqldump -u root -p your_database orders > orders_backup.sql
```

## Restore to a Different Database

Restore a backup into a differently named database:

```bash
# Create target
mysql -u root -p -e "CREATE DATABASE restored_db CHARACTER SET utf8mb4"

# If dump has no CREATE DATABASE / USE, restore directly
mysql -u root -p restored_db < backup.sql

# If dump includes USE statement, edit or override with sed
sed 's/USE `your_database`/USE `restored_db`/' backup.sql | mysql -u root -p
```

## Performance Tips for Large Restores

Disable foreign key checks and unique checks to speed up inserts:

```sql
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;
```

The `FOREIGN_KEY_CHECKS` and `UNIQUE_CHECKS` variables are already included in the default mysqldump output preamble. Check the top of the SQL file:

```bash
head -30 backup.sql
```

Also set these session variables:

```bash
mysql -u root -p --init-command="SET FOREIGN_KEY_CHECKS=0; SET UNIQUE_CHECKS=0;" \
  your_database < backup.sql
```

Increase `innodb_buffer_pool_size` and `innodb_log_buffer_size` temporarily for faster bulk inserts.

## Monitoring Progress for Large Restores

`pv` shows progress when piping large files:

```bash
pv backup.sql.gz | gunzip | mysql -u root -p your_database
```

This shows estimated time, speed, and percentage complete.

## Summary

Restore a mysqldump backup by piping the SQL file into the `mysql` client with `mysql -u root -p database < backup.sql`. For compressed backups, use `gunzip < file.gz | mysql ...`. Create the target database first if the dump does not include `CREATE DATABASE`. For large restores, temporarily disable foreign key and unique key checks and use `pv` to monitor progress.
