# How to Manage PostgreSQL Schema Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Schema Migrations, Flyway, Liquibase, Alembic, Database Versioning

Description: A comprehensive guide to managing PostgreSQL schema migrations, covering migration tools, version control, zero-downtime strategies, and best practices for database changes.

---

Schema migrations are essential for evolving your database schema safely and consistently. This guide covers popular migration tools and strategies for PostgreSQL.

## Prerequisites

- PostgreSQL database
- Version control system (Git)
- Understanding of your deployment process

## Migration Tools Overview

| Tool | Language | Format |
|------|----------|--------|
| Flyway | Java/CLI | SQL, Java |
| Liquibase | Java/CLI | XML, YAML, SQL |
| Alembic | Python | Python |
| golang-migrate | Go | SQL |
| sqitch | Perl | SQL |

## Flyway

### Installation

```bash
# Download Flyway
wget -qO- https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/9.22.0/flyway-commandline-9.22.0-linux-x64.tar.gz | tar xvz

# Add to PATH
export PATH=$PATH:/path/to/flyway-9.22.0
```

### Configuration

```conf
# flyway.conf
flyway.url=jdbc:postgresql://localhost:5432/myapp
flyway.user=postgres
flyway.password=secret
flyway.locations=filesystem:./migrations
flyway.baselineOnMigrate=true
```

### Migration Files

```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- V2__add_name_to_users.sql
ALTER TABLE users ADD COLUMN name VARCHAR(100);

-- V3__create_orders_table.sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Commands

```bash
# Run migrations
flyway migrate

# Check status
flyway info

# Validate migrations
flyway validate

# Repair checksum issues
flyway repair

# Baseline existing database
flyway baseline
```

## Liquibase

### Installation

```bash
# Download Liquibase
wget https://github.com/liquibase/liquibase/releases/download/v4.25.0/liquibase-4.25.0.tar.gz
tar xzf liquibase-4.25.0.tar.gz
```

### Configuration

```yaml
# liquibase.properties
changeLogFile=db/changelog/db.changelog-master.yaml
url=jdbc:postgresql://localhost:5432/myapp
username=postgres
password=secret
driver=org.postgresql.Driver
```

### Changelog (YAML)

```yaml
# db/changelog/db.changelog-master.yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: developer
      changes:
        - createTable:
            tableName: users
            columns:
              - column:
                  name: id
                  type: serial
                  constraints:
                    primaryKey: true
              - column:
                  name: email
                  type: varchar(255)
                  constraints:
                    nullable: false
                    unique: true

  - changeSet:
      id: 2
      author: developer
      changes:
        - addColumn:
            tableName: users
            columns:
              - column:
                  name: name
                  type: varchar(100)
```

### Commands

```bash
# Run migrations
liquibase update

# Check status
liquibase status

# Rollback
liquibase rollback-count 1

# Generate changelog from existing database
liquibase generate-changelog
```

## Alembic (Python)

### Installation

```bash
pip install alembic psycopg2-binary
```

### Initialize

```bash
alembic init migrations
```

### Configuration

```python
# alembic.ini
sqlalchemy.url = postgresql://postgres:secret@localhost/myapp

# migrations/env.py
from myapp.models import Base
target_metadata = Base.metadata
```

### Create Migration

```bash
# Auto-generate from models
alembic revision --autogenerate -m "create users table"

# Empty migration
alembic revision -m "custom migration"
```

### Migration File

```python
# migrations/versions/001_create_users_table.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('users')
```

### Commands

```bash
# Run migrations
alembic upgrade head

# Downgrade
alembic downgrade -1

# Show history
alembic history

# Show current version
alembic current
```

## golang-migrate

### Installation

```bash
# macOS
brew install golang-migrate

# Linux
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
```

### Migration Files

```sql
-- 001_create_users.up.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- 001_create_users.down.sql
DROP TABLE users;
```

### Commands

```bash
# Run migrations
migrate -path ./migrations -database "postgresql://localhost/myapp?sslmode=disable" up

# Rollback
migrate -path ./migrations -database "postgresql://localhost/myapp?sslmode=disable" down 1

# Force version (fix dirty state)
migrate -path ./migrations -database "postgresql://localhost/myapp?sslmode=disable" force 1
```

## Zero-Downtime Migrations

### Safe Operations

```sql
-- ADD COLUMN with DEFAULT (PostgreSQL 11+)
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- CREATE INDEX CONCURRENTLY
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- ADD CONSTRAINT with NOT VALID
ALTER TABLE orders ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;

-- Validate separately
ALTER TABLE orders VALIDATE CONSTRAINT fk_user;
```

### Dangerous Operations

```sql
-- AVOID: Exclusive lock on table
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
-- PostgreSQL 10 and earlier locks table

-- AVOID: Rewriting entire table
ALTER TABLE users ALTER COLUMN id TYPE BIGINT;

-- AVOID: Non-concurrent index
CREATE INDEX idx_users_email ON users(email);
```

### Multi-Step Migrations

```sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN new_status VARCHAR(20);

-- Step 2: Backfill data (in batches)
UPDATE users SET new_status = status WHERE id BETWEEN 1 AND 10000;
UPDATE users SET new_status = status WHERE id BETWEEN 10001 AND 20000;
-- ... continue in batches

-- Step 3: Add constraint
ALTER TABLE users ALTER COLUMN new_status SET NOT NULL;

-- Step 4: Drop old column (later)
ALTER TABLE users DROP COLUMN status;
```

## Best Practices

### Migration Naming

```
V001__create_users_table.sql
V002__add_email_index.sql
V003__create_orders_table.sql
```

### Idempotent Migrations

```sql
-- Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Use IF EXISTS for drops
DROP TABLE IF EXISTS old_table;
DROP INDEX IF EXISTS old_index;
```

### Transaction Control

```sql
-- Wrap in transaction (most tools do this automatically)
BEGIN;

CREATE TABLE new_table (...);
INSERT INTO new_table SELECT ...;

COMMIT;
```

### Testing Migrations

```bash
#!/bin/bash
# test_migrations.sh

# Start fresh database
docker run -d --name test-db -e POSTGRES_PASSWORD=test postgres:16

# Wait for startup
sleep 5

# Run migrations
flyway -url=jdbc:postgresql://localhost:5432/postgres migrate

# Verify
psql -h localhost -U postgres -c "\dt"

# Cleanup
docker stop test-db && docker rm test-db
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Database Migrations

on:
  push:
    paths:
      - 'migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Run migrations
        run: |
          flyway -url=jdbc:postgresql://postgres:5432/postgres migrate

      - name: Validate migrations
        run: |
          flyway -url=jdbc:postgresql://postgres:5432/postgres validate
```

## Conclusion

PostgreSQL schema migrations require:

1. **Version control** - Track all changes
2. **Appropriate tools** - Flyway, Liquibase, Alembic
3. **Zero-downtime strategies** - Concurrent operations
4. **Testing** - Verify before production
5. **Rollback plans** - Always have a way back

Choose tools that fit your stack and follow best practices for safe, repeatable migrations.
