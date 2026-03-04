# How to Migrate from MariaDB to PostgreSQL on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, PostgreSQL, Migration, Database, pgloader

Description: Migrate your data from MariaDB to PostgreSQL on RHEL using pgloader for automated schema conversion and data transfer with minimal manual effort.

---

Migrating from MariaDB to PostgreSQL involves converting schemas, data types, and application queries. pgloader automates most of this process. This guide covers the practical steps for a migration on RHEL.

## Install pgloader

```bash
# Install pgloader from EPEL
sudo dnf install -y epel-release
sudo dnf install -y pgloader

# Verify installation
pgloader --version
```

## Prepare the Source MariaDB Database

```bash
# Create a read-only user for the migration
mysql -u root -p -e "
CREATE USER 'migrator'@'localhost' IDENTIFIED BY 'migratorpass';
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES ON myapp.* TO 'migrator'@'localhost';
FLUSH PRIVILEGES;
"

# Check the source database size
mysql -u root -p -e "
SELECT table_schema AS db,
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'myapp'
GROUP BY table_schema;
"
```

## Prepare the Target PostgreSQL Database

```bash
# Create the target database and user
sudo -u postgres psql -c "CREATE USER myapp WITH PASSWORD 'pgpass123';"
sudo -u postgres psql -c "CREATE DATABASE myapp_pg OWNER myapp;"
```

## Run pgloader

### Basic Migration

```bash
# Simple one-line migration
pgloader mysql://migrator:migratorpass@localhost/myapp \
         postgresql://myapp:pgpass123@localhost/myapp_pg
```

### Advanced Migration with a Control File

For more control over the migration, create a pgloader command file:

```bash
# Create the migration script
tee /tmp/migrate.load << 'EOF'
LOAD DATABASE
    FROM mysql://migrator:migratorpass@localhost/myapp
    INTO postgresql://myapp:pgpass123@localhost/myapp_pg

WITH include drop, create tables, create indexes, reset sequences,
     workers = 4, concurrency = 2

SET PostgreSQL PARAMETERS
    maintenance_work_mem to '512MB',
    work_mem to '64MB'

-- Type casting rules
CAST type datetime to timestamptz
                 drop default drop not null using zero-dates-to-null,
     type int with extra auto_increment to serial,
     type bigint with extra auto_increment to bigserial,
     type tinyint to smallint,
     type mediumint to integer,
     type float to real,
     type double to double precision,
     type enum to text,
     type set to text,
     type longtext to text,
     type mediumtext to text

-- Exclude specific tables if needed
-- EXCLUDING TABLE NAMES MATCHING 'sessions', 'cache'

BEFORE LOAD DO
    $$ CREATE SCHEMA IF NOT EXISTS public; $$;
EOF

# Run the migration
pgloader /tmp/migrate.load
```

## Verify the Migration

```bash
# Count rows in MariaDB
mysql -u migrator -p -e "
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'myapp'
ORDER BY table_name;
"

# Count rows in PostgreSQL
sudo -u postgres psql -d myapp_pg -c "
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY relname;
"

# Compare specific table data
mysql -u migrator -p -e "SELECT COUNT(*) FROM myapp.users;"
sudo -u postgres psql -d myapp_pg -c "SELECT COUNT(*) FROM users;"
```

## Common Data Type Differences

```
MariaDB              PostgreSQL
---------            ----------
TINYINT              SMALLINT
MEDIUMINT            INTEGER
INT AUTO_INCREMENT   SERIAL
BIGINT AUTO_INCREMENT BIGSERIAL
DATETIME             TIMESTAMP
DOUBLE               DOUBLE PRECISION
ENUM(...)            TEXT (with CHECK constraint)
LONGTEXT             TEXT
BLOB                 BYTEA
```

## Post-Migration Tasks

```bash
# Run ANALYZE to update PostgreSQL query planner statistics
sudo -u postgres psql -d myapp_pg -c "ANALYZE;"

# Check for any sequences that need resetting
sudo -u postgres psql -d myapp_pg -c "
SELECT sequencename, last_value
FROM pg_sequences;
"

# Test application queries and fix any MySQL-specific syntax
# Common changes needed:
# - LIMIT x,y  becomes  LIMIT y OFFSET x
# - Backtick quoting becomes double-quote quoting
# - IFNULL() becomes COALESCE()
# - NOW() works in both
```

pgloader handles the heavy lifting, but you should always test your application thoroughly against the new PostgreSQL database before switching production traffic.
