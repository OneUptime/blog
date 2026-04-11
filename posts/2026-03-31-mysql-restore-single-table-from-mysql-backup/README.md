# How to Restore a Single Table from a MySQL Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Restore, Database, Recovery

Description: Learn how to extract and restore a single table from a full MySQL backup using mysqldump, sed, and other techniques.

---

When a full database restore is unnecessary, restoring a single table from a backup saves time and reduces risk. Whether you accidentally dropped a table or need to recover specific rows, MySQL provides several techniques to extract and restore individual tables from backup files.

## Dumping a Single Table Directly

The cleanest approach is creating a table-specific backup from the start. When taking backups, you can specify individual tables:

```bash
mysqldump -u root -p mydb orders > orders_backup.sql
```

Restoring it is then straightforward:

```bash
mysql -u root -p mydb < orders_backup.sql
```

## Extracting a Table from a Full Dump

If you have an existing full database dump, you can extract a single table's DDL and data using `sed`:

```bash
sed -n '/^-- Table structure for table `orders`/,/^-- Table structure for table/p' full_backup.sql > orders_extracted.sql
```

A more reliable approach uses `sed` and `grep` separately - one for structure and one for data:

```bash
# Extract table structure and LOCK TABLES statement
sed -n '/^DROP TABLE IF EXISTS `orders`/,/^LOCK TABLES/p' full_backup.sql > orders_restore.sql

# Append INSERT statements
grep "^INSERT INTO \`orders\`" full_backup.sql >> orders_restore.sql

echo "UNLOCK TABLES;" >> orders_restore.sql
```

## Using a Python Script for Clean Extraction

For reliability, a small Python script handles edge cases better than shell one-liners:

```python
def extract_table(dump_file, table_name, output_file):
    capture = False
    with open(dump_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line in infile:
            if f'Table structure for table `{table_name}`' in line:
                capture = True
            elif capture and line.startswith('-- Table structure for table') and table_name not in line:
                capture = False
            if capture or line.startswith(f'INSERT INTO `{table_name}`'):
                outfile.write(line)

extract_table('full_backup.sql', 'orders', 'orders_restore.sql')
```

```bash
python3 extract_table.py
mysql -u root -p mydb < orders_restore.sql
```

## Restoring to a Different Table Name

You may want to restore to a staging table to compare data before overwriting production. After extracting, rename the table in the SQL file:

```bash
sed 's/`orders`/`orders_restore_temp`/g' orders_extracted.sql > orders_temp.sql
mysql -u root -p mydb < orders_temp.sql
```

Then compare and migrate specific rows:

```sql
INSERT INTO orders
SELECT * FROM orders_restore_temp
WHERE order_id IN (SELECT order_id FROM orders_restore_temp
                   WHERE created_at >= '2024-01-01');

DROP TABLE orders_restore_temp;
```

## Restoring from a Physical Backup

If using Percona XtraBackup or MySQL Enterprise Backup, you can use the `--export` option for InnoDB tables:

```bash
# Prepare the backup
xtrabackup --prepare --export --target-dir=/var/backup/mysql

# Discard the existing tablespace
mysql -u root -p -e "ALTER TABLE mydb.orders DISCARD TABLESPACE;"

# Copy the .ibd and .cfg files
cp /var/backup/mysql/mydb/orders.ibd /var/lib/mysql/mydb/
cp /var/backup/mysql/mydb/orders.cfg /var/lib/mysql/mydb/

# Import the tablespace
mysql -u root -p -e "ALTER TABLE mydb.orders IMPORT TABLESPACE;"
```

## Summary

The simplest method to restore a single table is creating per-table dumps. When working with a full dump, use `sed` or a Python script to extract the relevant DDL and INSERT statements. For physical backups, InnoDB's tablespace import feature offers the fastest recovery. Always test restores on a staging table first to verify data integrity before replacing production data.
