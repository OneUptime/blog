# How to Implement GitOps for MySQL Schema Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GitOps, Schema Migration, CI/CD, DevOps

Description: Implement a GitOps workflow for MySQL schema changes using pull requests, automated validation, and controlled deployment pipelines.

---

## GitOps for Database Schema

GitOps applies the same principles used for infrastructure code to database schema management: all changes are made through pull requests, validated automatically, and deployed from a single source of truth in Git. This gives you an audit trail of every schema change, the ability to review migrations before they run, and a consistent process for all environments.

## Choosing a Migration Tool

For GitOps-style MySQL schema management, Flyway and Liquibase are the most common choices. Flyway uses plain SQL migration files with a naming convention:

```text
db/migrations/
├── V1__initial_schema.sql
├── V2__add_orders_table.sql
├── V3__add_index_on_orders_status.sql
└── V4__add_customer_email_column.sql
```

Flyway tracks which migrations have been applied in a `flyway_schema_history` table and only runs new files.

## Migration File Convention

```sql
-- V3__add_index_on_orders_status.sql
-- Description: Add index on orders.status to improve query performance
-- Jira: INFRA-4521
-- Author: nawazdhandala

ALTER TABLE orders
  ADD INDEX idx_orders_status_created (status, created_at);
```

## Repository Structure

```text
mysql-schema/
├── db/
│   └── migrations/
│       ├── V1__initial_schema.sql
│       └── V2__add_orders_table.sql
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── deploy.yml
├── flyway.conf
└── README.md
```

## Flyway Configuration

```text
# flyway.conf
flyway.url=jdbc:mysql://${MYSQL_HOST}:3306/${MYSQL_DATABASE}
flyway.user=${MYSQL_USER}
flyway.password=${MYSQL_PASSWORD}
flyway.locations=filesystem:db/migrations
flyway.validateOnMigrate=true
flyway.outOfOrder=false
```

## Validation Workflow on Pull Request

```yaml
# .github/workflows/validate.yml
name: Validate MySQL Migrations

on:
  pull_request:
    paths:
      - 'db/migrations/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpassword
          MYSQL_DATABASE: testdb
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Run Flyway migration against test database
        run: |
          docker run --rm \
            --network host \
            -e FLYWAY_URL=jdbc:mysql://127.0.0.1:3306/testdb \
            -e FLYWAY_USER=root \
            -e FLYWAY_PASSWORD=testpassword \
            -v $(pwd)/db/migrations:/flyway/sql \
            flyway/flyway:10 migrate

      - name: Verify migration status
        run: |
          docker run --rm \
            --network host \
            -e FLYWAY_URL=jdbc:mysql://127.0.0.1:3306/testdb \
            -e FLYWAY_USER=root \
            -e FLYWAY_PASSWORD=testpassword \
            -v $(pwd)/db/migrations:/flyway/sql \
            flyway/flyway:10 info
```

## Deployment Workflow on Merge

```yaml
# .github/workflows/deploy.yml
name: Deploy MySQL Migrations

on:
  push:
    branches: [main]
    paths:
      - 'db/migrations/**'

jobs:
  deploy-staging:
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run migrations on staging
        run: |
          docker run --rm \
            -e FLYWAY_URL=jdbc:mysql://${{ secrets.STAGING_MYSQL_HOST }}:3306/${{ secrets.STAGING_MYSQL_DB }} \
            -e FLYWAY_USER=${{ secrets.STAGING_MYSQL_USER }} \
            -e FLYWAY_PASSWORD=${{ secrets.STAGING_MYSQL_PASSWORD }} \
            -v $(pwd)/db/migrations:/flyway/sql \
            flyway/flyway:10 migrate

  deploy-production:
    needs: deploy-staging
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run migrations on production
        run: |
          docker run --rm \
            -e FLYWAY_URL=jdbc:mysql://${{ secrets.PROD_MYSQL_HOST }}:3306/${{ secrets.PROD_MYSQL_DB }} \
            -e FLYWAY_USER=${{ secrets.PROD_MYSQL_USER }} \
            -e FLYWAY_PASSWORD=${{ secrets.PROD_MYSQL_PASSWORD }} \
            -v $(pwd)/db/migrations:/flyway/sql \
            flyway/flyway:10 migrate
```

## Summary

A GitOps workflow for MySQL schema changes uses versioned migration files in Git as the single source of truth. Pull requests trigger automated validation against a temporary MySQL instance, preventing broken migrations from reaching production. Merges to main automatically deploy to staging first, then production, providing a safe, auditable promotion path for every schema change.
