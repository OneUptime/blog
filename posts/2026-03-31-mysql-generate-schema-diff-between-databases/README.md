# How to Generate a Schema Diff Between Two MySQL Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Diff, Migration Script, DevOps

Description: Learn how to generate an ALTER script from the schema diff between two MySQL databases using skeema, mysqldiff, and information_schema queries.

---

Generating a diff as an executable ALTER script - rather than just a comparison report - lets you apply the differences automatically. This is especially useful when promoting schema changes from development to production.

## Using skeema to Generate ALTER Scripts

`skeema` is the most reliable tool for generating safe ALTER scripts from schema diffs.

```bash
# Initialize skeema from the development database (the desired state)
skeema init --host=dev-host --user=root --password=secret --schema=myapp --dir=schema

# Preview the ALTER statements needed to update production
cd schema
skeema diff --host=prod-host --user=root --password=secret

# Apply the changes to production
skeema push --host=prod-host --user=root --password=secret
```

## Using mysqldump + applyschema Pattern

```bash
# Dump production schema
mysqldump --no-data --skip-comments -u root -p \
          --databases myapp > prod.sql

# Dump dev schema
mysqldump --no-data --skip-comments -u root -p \
          --databases myapp_dev > dev.sql

# Use mysql-diff to generate ALTER statements from the two dumps
pip install mysql-diff
mysql-diff prod.sql dev.sql
```

## Generating Diff From information_schema

For columns that exist in dev but not in production:

```sql
-- Run on a server that has both databases
SELECT
    d.TABLE_NAME,
    d.COLUMN_NAME,
    d.COLUMN_TYPE,
    d.IS_NULLABLE,
    d.COLUMN_DEFAULT,
    CONCAT(
        'ALTER TABLE `myapp`.`', d.TABLE_NAME, '` ',
        'ADD COLUMN `', d.COLUMN_NAME, '` ',
        d.COLUMN_TYPE,
        CASE d.IS_NULLABLE WHEN 'NO' THEN ' NOT NULL' ELSE ' NULL' END,
        CASE WHEN d.COLUMN_DEFAULT IS NOT NULL
             THEN CONCAT(' DEFAULT ', QUOTE(d.COLUMN_DEFAULT))
             ELSE '' END, ';'
    ) AS alter_statement
FROM information_schema.COLUMNS d
WHERE d.TABLE_SCHEMA = 'myapp_dev'
  AND NOT EXISTS (
      SELECT 1 FROM information_schema.COLUMNS p
      WHERE p.TABLE_SCHEMA = 'myapp'
        AND p.TABLE_NAME   = d.TABLE_NAME
        AND p.COLUMN_NAME  = d.COLUMN_NAME
  );
```

## Generating Missing Index Statements

```sql
SELECT
    d.TABLE_NAME,
    d.INDEX_NAME,
    CONCAT(
        'ALTER TABLE `myapp`.`', d.TABLE_NAME, '` ',
        'ADD INDEX `', d.INDEX_NAME, '` (',
        GROUP_CONCAT(CONCAT('`', d.COLUMN_NAME, '`') ORDER BY d.SEQ_IN_INDEX),
        ');'
    ) AS add_index_sql
FROM information_schema.STATISTICS d
WHERE d.TABLE_SCHEMA = 'myapp_dev'
  AND d.INDEX_NAME != 'PRIMARY'
  AND NOT EXISTS (
      SELECT 1 FROM information_schema.STATISTICS p
      WHERE p.TABLE_SCHEMA = 'myapp'
        AND p.TABLE_NAME  = d.TABLE_NAME
        AND p.INDEX_NAME  = d.INDEX_NAME
  )
GROUP BY d.TABLE_NAME, d.INDEX_NAME;
```

## Using mysqldbcompare from MySQL Utilities

```bash
# mysqldbcompare from the mysql-utilities package can generate a migration script
mysqldbcompare --server1=root@dev \
               --server2=root@prod \
               myapp:myapp \
               --difftype=sql \
               --changes-for=server2 \
               --show-reverse
```

## Validating Before Applying

```bash
# Always test the generated script on a copy of production first
mysql -u root -p myapp_copy < generated_diff.sql

# Verify the migrated copy matches the dev schema
mysqldump --no-data --skip-comments -u root -p myapp_copy > migrated.sql
mysqldump --no-data --skip-comments -u root -p myapp_dev > expected.sql
diff migrated.sql expected.sql
```

## Summary

Use skeema for the most reliable diff-to-ALTER-script workflow in CI/CD. For ad-hoc diffs, query `information_schema.COLUMNS` and `information_schema.STATISTICS` to generate ALTER statements. Always test generated scripts on a staging copy before applying to production. Use `--dry-run` or `skeema diff` without `push` to review changes before execution.
