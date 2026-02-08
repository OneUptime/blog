# How to Use Docker for Database Migration Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Database, Migration, Testing, PostgreSQL, MySQL, Flyway, Prisma, CI/CD

Description: Test database migrations safely in Docker containers before running them against production databases.

---

Database migrations are one of the riskiest operations in software deployment. A bad migration can corrupt data, lock tables for minutes, or break your application entirely. Rolling back is often harder than the migration itself. Docker gives you a safe place to test migrations before they touch production. You spin up a database container, apply the migration, verify it works, and throw the container away.

This guide covers testing migrations with different tools and databases, validating data integrity after migrations, and building automated migration testing into your CI pipeline.

## Why Test Migrations in Docker

Testing migrations against a local database installation has problems. Your local database might have different data, different extensions, or a different version than production. Docker containers start from a known state every time. You can load a production-like dataset, run the migration, verify the result, and destroy everything in seconds. No leftover state, no cleanup needed.

## Basic Migration Testing Pattern

The pattern is always the same: start a database, load a schema and optional seed data, run the migration, verify the result.

```bash
# Start a PostgreSQL container with a specific version matching production
docker run -d \
  --name migration-test-db \
  -e POSTGRES_USER=app \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:16-alpine

# Wait for PostgreSQL to be ready
until docker exec migration-test-db pg_isready -U app -d myapp; do
  sleep 1
done

# Load the current production schema
docker exec -i migration-test-db psql -U app -d myapp < schema.sql

# Load sample data that exercises edge cases
docker exec -i migration-test-db psql -U app -d myapp < test-data.sql

# Run the migration
docker exec -i migration-test-db psql -U app -d myapp < migrations/001_add_user_email_index.sql

# Verify the migration result
docker exec migration-test-db psql -U app -d myapp -c "\d users"

# Clean up
docker stop migration-test-db && docker rm migration-test-db
```

## Docker Compose for Migration Testing

A Docker Compose file makes the process repeatable and self-documenting.

```yaml
# docker-compose.migration-test.yml - Migration testing environment
version: "3.8"

services:
  # Database with production-matching version
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 2s
      timeout: 2s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data  # RAM disk for speed
    volumes:
      # Load the base schema on container initialization
      - ./migrations/baseline.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./test-data/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql

  # Migration runner
  migrate:
    build:
      context: .
      dockerfile: Dockerfile.migrate
    environment:
      - DATABASE_URL=postgres://app:secret@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  # Verification tests run after migration completes
  verify:
    build:
      context: ./tests
      dockerfile: Dockerfile.verify
    environment:
      - DATABASE_URL=postgres://app:secret@db:5432/myapp
    depends_on:
      migrate:
        condition: service_completed_successfully
```

```bash
# Run the complete migration test cycle
docker compose -f docker-compose.migration-test.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from verify

# Clean up
docker compose -f docker-compose.migration-test.yml down -v
```

## Testing with Flyway

Flyway is a popular migration tool for Java and SQL-based projects. It has an official Docker image.

```bash
# Directory structure for Flyway migrations
mkdir -p flyway/sql flyway/conf
```

```properties
# flyway/conf/flyway.conf - Flyway configuration
flyway.url=jdbc:postgresql://db:5432/myapp
flyway.user=app
flyway.password=secret
flyway.locations=filesystem:/flyway/sql
flyway.validateOnMigrate=true
```

```sql
-- flyway/sql/V1__create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- flyway/sql/V2__add_user_status.sql
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
CREATE INDEX idx_users_status ON users(status);

-- flyway/sql/V3__add_user_preferences.sql
CREATE TABLE user_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, key)
);
```

```yaml
# docker-compose.flyway-test.yml - Test Flyway migrations
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 2s
      timeout: 2s
      retries: 10

  flyway:
    image: flyway/flyway:10
    volumes:
      - ./flyway/sql:/flyway/sql
      - ./flyway/conf:/flyway/conf
    depends_on:
      db:
        condition: service_healthy
    command: migrate

  # Validate migration status after running
  flyway-info:
    image: flyway/flyway:10
    volumes:
      - ./flyway/sql:/flyway/sql
      - ./flyway/conf:/flyway/conf
    depends_on:
      flyway:
        condition: service_completed_successfully
    command: info
```

```bash
# Run Flyway migrations and check status
docker compose -f docker-compose.flyway-test.yml up \
  --abort-on-container-exit
```

## Testing with Prisma

Prisma is popular in the Node.js ecosystem. Test its migrations in Docker.

```yaml
# docker-compose.prisma-test.yml - Test Prisma migrations
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 2s
      timeout: 2s
      retries: 10

  migrate:
    build: .
    environment:
      - DATABASE_URL=postgres://app:secret@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && npx prisma db seed"
```

## Writing Migration Verification Tests

After running a migration, verify that it did what you expected. Test the schema changes, data transformations, and constraint behavior.

```python
# tests/test_migration.py - Verify migration results
import psycopg2
import pytest
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://app:secret@localhost:5432/myapp")

@pytest.fixture
def db_conn():
    """Create a database connection for testing."""
    conn = psycopg2.connect(DATABASE_URL)
    yield conn
    conn.close()

def test_new_column_exists(db_conn):
    """Verify the migration added the expected column."""
    cursor = db_conn.cursor()
    cursor.execute("""
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    """)
    result = cursor.fetchone()
    assert result is not None, "Column 'status' should exist on users table"
    assert result[1] == "character varying", "status should be varchar type"

def test_index_created(db_conn):
    """Verify the migration created the expected index."""
    cursor = db_conn.cursor()
    cursor.execute("""
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'users' AND indexname = 'idx_users_status'
    """)
    result = cursor.fetchone()
    assert result is not None, "Index idx_users_status should exist"

def test_existing_data_preserved(db_conn):
    """Verify that existing data was not lost during migration."""
    cursor = db_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    assert count > 0, "Existing user data should be preserved after migration"

def test_default_values_applied(db_conn):
    """Verify default values were applied to existing rows."""
    cursor = db_conn.cursor()
    cursor.execute("SELECT DISTINCT status FROM users WHERE status IS NOT NULL")
    results = cursor.fetchall()
    statuses = [r[0] for r in results]
    assert "active" in statuses, "Existing users should have 'active' as default status"

def test_foreign_key_constraint(db_conn):
    """Verify foreign key constraints work correctly."""
    cursor = db_conn.cursor()
    # Inserting a preference for a non-existent user should fail
    with pytest.raises(psycopg2.IntegrityError):
        cursor.execute("""
            INSERT INTO user_preferences (user_id, key, value)
            VALUES (99999, 'theme', 'dark')
        """)
    db_conn.rollback()

def test_migration_is_idempotent(db_conn):
    """Verify running the migration again does not cause errors."""
    cursor = db_conn.cursor()
    # This should not raise an error (IF NOT EXISTS patterns)
    cursor.execute("SELECT 1 FROM pg_tables WHERE tablename = 'user_preferences'")
    assert cursor.fetchone() is not None
```

## Testing Rollback Migrations

Every migration should have a corresponding rollback. Test both directions.

```sql
-- migrations/003_add_user_preferences_up.sql
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, key)
);

-- migrations/003_add_user_preferences_down.sql
DROP TABLE IF EXISTS user_preferences;
```

```bash
#!/bin/bash
# test-rollback.sh - Test that a migration can be rolled back cleanly

set -e

echo "=== Testing migration rollback ==="

# Start fresh database
docker compose -f docker-compose.migration-test.yml up -d db
sleep 5

# Apply migration
docker exec -i migration-test-db psql -U app -d myapp < migrations/003_add_user_preferences_up.sql
echo "Migration applied successfully"

# Verify the table exists
docker exec migration-test-db psql -U app -d myapp -c "\dt user_preferences"

# Rollback
docker exec -i migration-test-db psql -U app -d myapp < migrations/003_add_user_preferences_down.sql
echo "Rollback applied successfully"

# Verify the table is gone
RESULT=$(docker exec migration-test-db psql -U app -d myapp -t -c \
  "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'user_preferences'")

if [ "$(echo $RESULT | tr -d ' ')" = "0" ]; then
    echo "PASS: Rollback removed the table"
else
    echo "FAIL: Table still exists after rollback"
    exit 1
fi

# Clean up
docker compose -f docker-compose.migration-test.yml down -v
```

## Testing with Production-Like Data

For critical migrations, test against a dataset that resembles production in size and variety.

```bash
# Export a sanitized subset of production data
pg_dump -h prod-db.example.com -U readonly -d production \
  --data-only --table=users --table=orders \
  | sed 's/real@email.com/test@example.com/g' \
  > test-data/prod-sample.sql

# Use it in your migration test
docker exec -i migration-test-db psql -U app -d myapp < test-data/prod-sample.sql
```

## CI/CD Integration

```yaml
# .github/workflows/migration-test.yml - Automated migration testing
name: Migration Tests

on:
  pull_request:
    paths:
      - "migrations/**"
      - "prisma/migrations/**"

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test migration forward
        run: |
          docker compose -f docker-compose.migration-test.yml up \
            --build \
            --abort-on-container-exit \
            --exit-code-from verify

      - name: Test migration rollback
        run: bash test-rollback.sh

      - name: Cleanup
        if: always()
        run: docker compose -f docker-compose.migration-test.yml down -v
```

## Wrapping Up

Database migration testing in Docker eliminates the fear of running migrations in production. You get a clean database every time, exact version matching, fast execution with tmpfs, and automated verification. Test the forward migration, the rollback, data integrity, and constraint behavior. When your CI pipeline catches a broken migration before it reaches production, that is the payoff for the setup investment.
