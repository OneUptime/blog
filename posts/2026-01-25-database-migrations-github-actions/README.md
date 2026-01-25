# How to Run Database Migrations with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Database, Migrations, CI/CD, DevOps, PostgreSQL, Flyway

Description: Learn how to safely run database migrations in your CI/CD pipeline with GitHub Actions, including validation, rollback strategies, and handling migrations across multiple environments.

---

Database migrations are one of the trickiest parts of deployment automation. Unlike application code, you cannot simply roll back a database change. This guide covers patterns for running migrations safely in GitHub Actions.

## Migration Workflow Architecture

A safe migration workflow includes validation, backup, execution, and verification:

```mermaid
flowchart TD
    A[Migration PR] --> B[Validate Syntax]
    B --> C[Test on Ephemeral DB]
    C --> D{Tests Pass?}
    D -->|Yes| E[Approve & Merge]
    D -->|No| F[Fix Migration]
    E --> G[Backup Production]
    G --> H[Run Migration]
    H --> I[Verify Schema]
    I --> J[Deploy Application]
```

## Basic Migration Job

Start with a simple migration job using your framework's migration tool:

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'migrations/**'
      - 'db/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      # Run migrations with your ORM/migration tool
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Migration Validation in Pull Requests

Catch migration issues before they reach production by testing them in CI:

```yaml
name: Validate Migrations

on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'prisma/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history to compare migrations

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      # Apply all migrations from scratch
      - name: Test migrations from clean state
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

      # Verify schema matches expected state
      - name: Validate schema
        run: npx prisma validate
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

      # Check for destructive changes
      - name: Check for destructive migrations
        run: |
          # Look for DROP TABLE, DROP COLUMN in new migrations
          git diff origin/main...HEAD -- migrations/ | grep -iE "(DROP TABLE|DROP COLUMN)" && {
            echo "Warning: Destructive migration detected!"
            echo "Ensure you have a backup plan and data migration strategy."
          } || echo "No destructive changes found"
```

## Using Flyway for Java Projects

Flyway is a popular migration tool for Java applications:

```yaml
jobs:
  migrate-flyway:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      # Run Flyway migrations using Docker
      - name: Run Flyway migrations
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/sql:/flyway/sql \
            flyway/flyway:latest \
            -url="${{ secrets.JDBC_URL }}" \
            -user="${{ secrets.DB_USER }}" \
            -password="${{ secrets.DB_PASSWORD }}" \
            -connectRetries=3 \
            migrate

      # Verify migration status
      - name: Check migration status
        run: |
          docker run --rm \
            flyway/flyway:latest \
            -url="${{ secrets.JDBC_URL }}" \
            -user="${{ secrets.DB_USER }}" \
            -password="${{ secrets.DB_PASSWORD }}" \
            info
```

Flyway configuration file for version control:

```conf
# flyway.conf
flyway.locations=filesystem:sql/migrations
flyway.sqlMigrationPrefix=V
flyway.sqlMigrationSeparator=__
flyway.validateOnMigrate=true
flyway.outOfOrder=false
```

## Pre-Migration Backup

Always backup before running migrations in production:

```yaml
jobs:
  backup-and-migrate:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      # Create a backup before migration
      - name: Backup database
        id: backup
        run: |
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          BACKUP_NAME="pre-migration-${TIMESTAMP}"

          # For PostgreSQL
          PGPASSWORD=${{ secrets.DB_PASSWORD }} pg_dump \
            -h ${{ secrets.DB_HOST }} \
            -U ${{ secrets.DB_USER }} \
            -d ${{ secrets.DB_NAME }} \
            -F c \
            -f "${BACKUP_NAME}.dump"

          # Upload to S3
          aws s3 cp "${BACKUP_NAME}.dump" \
            "s3://${{ secrets.BACKUP_BUCKET }}/migrations/${BACKUP_NAME}.dump"

          echo "backup-name=${BACKUP_NAME}" >> $GITHUB_OUTPUT
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      # Run the migration
      - name: Run migration
        id: migrate
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        continue-on-error: true

      # Restore from backup if migration fails
      - name: Restore backup on failure
        if: steps.migrate.outcome == 'failure'
        run: |
          echo "Migration failed, restoring from backup..."
          aws s3 cp \
            "s3://${{ secrets.BACKUP_BUCKET }}/migrations/${{ steps.backup.outputs.backup-name }}.dump" \
            restore.dump

          PGPASSWORD=${{ secrets.DB_PASSWORD }} pg_restore \
            -h ${{ secrets.DB_HOST }} \
            -U ${{ secrets.DB_USER }} \
            -d ${{ secrets.DB_NAME }} \
            --clean \
            restore.dump

          exit 1  # Fail the workflow after restore
```

## Multi-Environment Migration Strategy

Handle migrations across development, staging, and production:

```yaml
jobs:
  migrate-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Run staging migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify staging schema
        run: |
          npx prisma db pull --print
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  migrate-production:
    needs: migrate-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Create backup
        run: |
          # Backup production before migration
          ./scripts/backup-db.sh

      - name: Run production migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Notify on completion
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text": "Production migration completed successfully"}'
```

## Zero-Downtime Migration Pattern

For applications that cannot tolerate downtime, use expand-contract migrations:

```yaml
# Phase 1: Expand - Add new columns/tables
name: Migration Phase 1 - Expand

on:
  workflow_dispatch:
    inputs:
      migration_phase:
        type: choice
        options: [expand, migrate-data, contract]

jobs:
  expand:
    if: inputs.migration_phase == 'expand'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Apply expand migrations
        run: |
          # Add new column with nullable constraint
          psql $DATABASE_URL -f migrations/001_add_new_column.sql
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  migrate-data:
    if: inputs.migration_phase == 'migrate-data'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Migrate data in batches
        run: |
          # Move data in small batches to avoid locks
          ./scripts/migrate-data-batched.sh
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  contract:
    if: inputs.migration_phase == 'contract'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Apply contract migrations
        run: |
          # Remove old column after app is updated
          psql $DATABASE_URL -f migrations/003_remove_old_column.sql
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Handling Long-Running Migrations

Some migrations take too long for normal CI runners. Handle these with dedicated jobs:

```yaml
jobs:
  long-migration:
    runs-on: ubuntu-latest
    timeout-minutes: 120  # Extended timeout
    environment: production
    steps:
      - uses: actions/checkout@v4

      # Run migration with progress reporting
      - name: Run migration with progress
        run: |
          # Start migration in background
          npx prisma migrate deploy &
          PID=$!

          # Report progress every 30 seconds
          while kill -0 $PID 2>/dev/null; do
            echo "Migration still running..."
            sleep 30
          done

          # Check exit status
          wait $PID
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      # Verify completion
      - name: Verify migration completed
        run: |
          npx prisma migrate status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Schema Drift Detection

Detect when your schema drifts from expected state:

```yaml
jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for schema drift
        run: |
          # Pull current schema
          npx prisma db pull

          # Compare with committed schema
          if ! git diff --exit-code prisma/schema.prisma; then
            echo "Schema drift detected!"
            echo "The database schema differs from the committed schema."
            exit 1
          fi
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Best Practices

1. **Always test migrations first** - Run migrations against a test database that mirrors production schema.

2. **Make migrations idempotent** - Migrations should be safe to run multiple times.

3. **Avoid destructive operations** - Prefer adding new columns over modifying or dropping existing ones.

4. **Keep migrations small** - Large migrations are harder to debug and recover from.

5. **Backup before production migrations** - Always have a restore path.

6. **Separate migration from deployment** - Run migrations before deploying new application code, not during.

7. **Use transactions** - Wrap migrations in transactions where possible so failures roll back cleanly.

Database migrations require extra care in automation. The patterns above help you ship schema changes confidently.
