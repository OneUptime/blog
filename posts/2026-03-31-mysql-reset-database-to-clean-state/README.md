# How to Reset a MySQL Database to a Clean State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Testing, Reset, Migration, CI/CD

Description: Learn how to reset a MySQL database to a clean state for testing by dropping and recreating the database, running fresh migrations, and using Docker for disposable environments.

---

## When You Need a Clean Database State

A clean database state means starting from a known baseline - typically an empty schema with only the structure defined by your migrations. This is needed:
- Before running an integration test suite
- When a test corrupts shared state
- In CI/CD to ensure test isolation between pipeline runs
- When debugging migration scripts from scratch

## Method 1 - Drop and Recreate the Database

The fastest way to achieve a clean state is to drop the database entirely and recreate it:

```bash
mysql -h 127.0.0.1 -u root -proot -e "
DROP DATABASE IF EXISTS myapp_test;
CREATE DATABASE myapp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON myapp_test.* TO 'testuser'@'%';
FLUSH PRIVILEGES;
"
```

After recreating, run migrations to rebuild the schema:

```bash
# Flyway
flyway -url=jdbc:mysql://127.0.0.1:3306/myapp_test -user=testuser -password=testpass migrate

# Liquibase
liquibase --url=jdbc:mysql://127.0.0.1:3306/myapp_test update

# Or a custom migration script
npm run db:migrate
```

## Method 2 - TRUNCATE All Tables

For faster resets when you don't need to re-run migrations, truncate all tables:

```sql
SET FOREIGN_KEY_CHECKS = 0;

SELECT CONCAT('TRUNCATE TABLE `', table_schema, '`.`', table_name, '`;')
FROM information_schema.TABLES
WHERE table_schema = 'myapp_test'
  AND table_type = 'BASE TABLE';
```

Generate and execute the truncation dynamically in a script:

```bash
mysql -h 127.0.0.1 -u testuser -ptestpass myapp_test -e "
SET FOREIGN_KEY_CHECKS = 0;
$(mysql -h 127.0.0.1 -u testuser -ptestpass -N -e "
  SELECT CONCAT('TRUNCATE TABLE \`', table_name, '\`;')
  FROM information_schema.TABLES
  WHERE table_schema = 'myapp_test' AND table_type = 'BASE TABLE';
")
SET FOREIGN_KEY_CHECKS = 1;
"
```

## Method 3 - Restore from a Baseline Snapshot

Take a snapshot of the clean migrated schema (no data) and restore it for each reset:

```bash
# Create baseline snapshot (run once after migrations)
mysqldump -h 127.0.0.1 -u testuser -ptestpass \
  --no-data --routines --triggers myapp_test > tests/fixtures/baseline.sql

# Reset to clean state (run before each test suite)
mysql -h 127.0.0.1 -u root -proot -e "
DROP DATABASE IF EXISTS myapp_test;
CREATE DATABASE myapp_test;
GRANT ALL ON myapp_test.* TO 'testuser'@'%';
"
mysql -h 127.0.0.1 -u testuser -ptestpass myapp_test < tests/fixtures/baseline.sql
```

## Method 4 - Docker Container Restart

In CI environments using Docker, simply stop and restart the MySQL container. The `tmpfs` volume means data is always lost on restart:

```yaml
services:
  mysql:
    image: mysql:8.0
    tmpfs:
      - /var/lib/mysql
    environment:
      MYSQL_DATABASE: myapp_test
      MYSQL_ROOT_PASSWORD: testroot
```

```bash
docker compose restart mysql
# Wait for healthy status, then run migrations
```

## Using MySQL init Scripts for Auto-Reset

Place SQL and shell scripts in `/docker-entrypoint-initdb.d/`. MySQL runs these automatically when the data directory is empty (first initialization):

```bash
# Copy seed SQL into the init directory
cp tests/fixtures/schema.sql docker/init/01-schema.sql
cp tests/fixtures/seed.sql docker/init/02-seed.sql
```

When combined with `tmpfs` from Method 4, every container restart starts with an empty data directory, so these scripts run automatically each time.

## Summary

Reset MySQL to a clean state by dropping and recreating the database (most thorough), truncating all tables with `FOREIGN_KEY_CHECKS = 0` (fastest), or restoring from a baseline dump snapshot. In Docker environments, use `tmpfs` volumes so container restarts always start fresh. Pair any reset approach with schema migration tooling to ensure the structure stays current.
