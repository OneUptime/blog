# How to Handle MySQL in a CI/CD Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CI/CD, Testing, Docker, Migration

Description: Learn how to integrate MySQL into CI/CD pipelines using Docker containers for test databases, schema migrations, seed data, and automated rollback testing.

---

## MySQL in CI/CD Overview

A CI/CD pipeline for a MySQL-backed application typically needs to:
1. Spin up a fresh MySQL instance for each test run
2. Apply schema migrations
3. Seed test data
4. Run tests
5. Tear down the database

Docker and Docker Compose make this straightforward and reproducible.

## Docker Compose Setup for CI

Create a `docker-compose.ci.yml` for test database services:

```yaml
version: "3.9"
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: testroot
      MYSQL_DATABASE: myapp_test
      MYSQL_USER: testuser
      MYSQL_PASSWORD: testpass
    ports:
      - "3306:3306"
    tmpfs:
      - /var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-ptestroot"]
      interval: 5s
      timeout: 5s
      retries: 10
```

Using `tmpfs` for the data directory makes MySQL startup faster in CI (no disk I/O for data files) and automatically cleans up between runs.

## GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testroot
          MYSQL_DATABASE: myapp_test
          MYSQL_USER: testuser
          MYSQL_PASSWORD: testpass
        ports:
          - 3306:3306
        options: >-
          --health-cmd "mysqladmin ping -h localhost -u root -ptestroot"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Run database migrations
        env:
          DATABASE_URL: mysql://testuser:testpass@127.0.0.1:3306/myapp_test
        run: npm run db:migrate

      - name: Seed test data
        run: npm run db:seed:test

      - name: Run tests
        run: npm test
```

## Running Schema Migrations

Use a migration tool to apply schema changes in order. Example with Flyway:

```bash
flyway -url=jdbc:mysql://127.0.0.1:3306/myapp_test \
       -user=testuser \
       -password=testpass \
       -locations=filesystem:./migrations \
       migrate
```

Or with Liquibase:

```bash
liquibase \
  --url=jdbc:mysql://127.0.0.1:3306/myapp_test \
  --username=testuser \
  --password=testpass \
  --changeLogFile=changelog.xml \
  update
```

## Seeding Test Data

Keep seed scripts in the repository and run them after migrations:

```sql
-- tests/fixtures/seed.sql
INSERT INTO users (id, email, name) VALUES
  (1, 'alice@example.com', 'Alice'),
  (2, 'bob@example.com', 'Bob');

INSERT INTO products (id, name, price) VALUES
  (1, 'Widget', 9.99),
  (2, 'Gadget', 19.99);
```

```bash
mysql -h 127.0.0.1 -u testuser -ptestpass myapp_test < tests/fixtures/seed.sql
```

## Testing Rollback Migrations

Include rollback testing in your pipeline to ensure migrations can be safely reversed. Note that `flyway undo` requires Flyway Teams or Enterprise edition (it is not available in the Community edition):

```bash
# Apply migrations
flyway migrate

# Test rollback (requires Flyway Teams or Enterprise)
flyway undo

# Verify schema state after undo
mysql -h 127.0.0.1 -u root -ptestroot myapp_test -e \
  "SELECT COUNT(*) FROM information_schema.TABLES WHERE table_schema='myapp_test'"
```

## Environment Isolation

Never share a test database between parallel CI jobs. Use unique database names per job:

```bash
export DB_NAME="myapp_test_${GITHUB_RUN_ID}_${GITHUB_JOB}"
mysql -h 127.0.0.1 -u root -ptestroot -e "CREATE DATABASE \`${DB_NAME}\`"
```

## Summary

Integrate MySQL in CI/CD by using Docker service containers or Docker Compose with `tmpfs` for fast, disposable database instances. Apply schema migrations with Flyway or Liquibase, seed test fixtures via SQL files, and tear down automatically after each run. Test migration rollbacks explicitly, and use unique database names per pipeline job to prevent cross-job contamination.
