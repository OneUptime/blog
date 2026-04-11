# How to Integrate MySQL Migrations into CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CI/CD, Migration, Flyway, DevOps

Description: Integrate MySQL schema migrations into your CI/CD pipeline using Flyway, ensuring migrations are tested and deployed automatically with every release.

---

## Why Automate MySQL Migrations

Manual database migrations are a common source of deployment failures. Forgetting to run a migration, applying it in the wrong order, or running it against the wrong environment leads to production incidents. Integrating migrations directly into your CI/CD pipeline removes the manual step, ensures migrations are always applied before application code deploys, and creates a traceable history of every schema change.

## Migration Tool Setup

This guide uses Flyway, but the principles apply to Liquibase or any versioned migration tool. Add Flyway to your project:

```xml
<!-- pom.xml (Maven) -->
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-mysql</artifactId>
  <version>10.8.1</version>
</dependency>
```

Or for Node.js projects using db-migrate:

```bash
npm install db-migrate db-migrate-mysql --save-dev
```

## Migration File Structure

```text
src/main/resources/db/migration/
├── V1__create_users_table.sql
├── V2__create_orders_table.sql
├── V3__add_foreign_key_constraints.sql
└── V4__add_performance_indexes.sql
```

Each file is applied exactly once, in version order:

```sql
-- V4__add_performance_indexes.sql
ALTER TABLE orders ADD INDEX idx_user_id_status (user_id, status);
ALTER TABLE orders ADD INDEX idx_created_at (created_at);
```

## GitHub Actions Pipeline

A complete pipeline that tests the application, runs migrations, and deploys:

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: testdb
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-retries=5

    steps:
      - uses: actions/checkout@v4
      - name: Install Flyway CLI
        run: |
          wget -qO- https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.8.1/flyway-commandline-10.8.1-linux-x64.tar.gz | tar xz
          sudo ln -s $(pwd)/flyway-10.8.1/flyway /usr/local/bin/flyway
      - name: Run migrations on test database
        run: |
          flyway -url="jdbc:mysql://127.0.0.1:3306/testdb" \
                 -user=root \
                 -password=test \
                 -locations=filesystem:src/main/resources/db/migration \
                 migrate

      - name: Run application tests
        run: mvn test -Dspring.datasource.url=jdbc:mysql://127.0.0.1:3306/testdb

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Install Flyway CLI
        run: |
          wget -qO- https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.8.1/flyway-commandline-10.8.1-linux-x64.tar.gz | tar xz
          sudo ln -s $(pwd)/flyway-10.8.1/flyway /usr/local/bin/flyway
      - name: Run migrations on staging
        run: |
          flyway -url="${{ secrets.STAGING_DB_URL }}" \
                 -user="${{ secrets.STAGING_DB_USER }}" \
                 -password="${{ secrets.STAGING_DB_PASSWORD }}" \
                 migrate

      - name: Deploy application to staging
        run: ./scripts/deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Install Flyway CLI
        run: |
          wget -qO- https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/10.8.1/flyway-commandline-10.8.1-linux-x64.tar.gz | tar xz
          sudo ln -s $(pwd)/flyway-10.8.1/flyway /usr/local/bin/flyway
      - name: Run migrations on production
        run: |
          flyway -url="${{ secrets.PROD_DB_URL }}" \
                 -user="${{ secrets.PROD_DB_USER }}" \
                 -password="${{ secrets.PROD_DB_PASSWORD }}" \
                 migrate

      - name: Deploy application to production
        run: ./scripts/deploy.sh production
```

## Handling Migration Failures

When a migration fails in production, the pipeline should alert and halt:

```yaml
      - name: Run migrations with failure notification
        run: |
          if ! flyway migrate; then
            echo "Migration failed - triggering incident"
            curl -X POST "${{ secrets.ONEUPTIME_WEBHOOK }}" \
              -H "Content-Type: application/json" \
              -d '{"title":"MySQL Migration Failed","severity":"critical"}'
            exit 1
          fi
```

## Rollback Strategy

Flyway Community edition does not support automatic rollback. The `flyway undo` command and `U`-prefixed undo scripts require Flyway Teams or Enterprise (paid). If you have a paid license, prepare undo scripts alongside migrations:

```sql
-- U4__add_performance_indexes.sql (undo script)
ALTER TABLE orders DROP INDEX idx_user_id_status;
ALTER TABLE orders DROP INDEX idx_created_at;
```

To apply an undo:

```bash
flyway -url="$DB_URL" -user="$DB_USER" -password="$DB_PASS" undo
```

## Summary

Integrating MySQL migrations into CI/CD pipelines eliminates the risk of manual deployment errors by running Flyway migrations automatically before each application deployment. Migrations are validated against a real MySQL instance during testing, applied to staging before production, and failures trigger immediate alerts. Undo scripts provide a rollback path when issues arise.
