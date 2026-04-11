# How to Run MySQL Schema Validation in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Validation, CI/CD, Testing, Migration

Description: Add MySQL schema validation to your CI/CD pipeline to catch migration errors, constraint violations, and unsafe changes before they reach production.

---

## Why Validate Schema Changes in CI/CD

Schema validation in CI/CD catches problems before they cause production outages. A missing column, a dropped index that breaks a query, or a new NOT NULL column without a default can bring down your application. Running validation automatically on every pull request means these issues are caught when they are cheapest to fix.

## Types of Schema Validation

There are three main types of schema validation to add to your pipeline:

1. Syntax validation - Does the SQL parse correctly?
2. Migration validity - Does the migration apply cleanly to a fresh database?
3. Backward compatibility - Will the change break running application code?

## Syntax Validation with sqlfluff

`sqlfluff` validates SQL syntax and style:

```bash
pip install sqlfluff
```

```ini
# .sqlfluff
[sqlfluff]
dialect = mysql
templater = jinja
max_line_length = 120

[sqlfluff:rules:layout.indent]
indent_unit = space
tab_space_size = 4
```

```bash
# Validate all migration files
sqlfluff lint db/migrations/

# Check a specific file
sqlfluff lint db/migrations/V5__add_payments_table.sql
```

## Migration Validity Testing

Test that migrations apply cleanly in GitHub Actions:

```yaml
# .github/workflows/schema-validate.yml
name: Validate MySQL Schema

on:
  pull_request:
    paths:
      - 'db/migrations/**'

jobs:
  syntax-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install sqlfluff
        run: pip install sqlfluff
      - name: Lint SQL migrations
        run: sqlfluff lint db/migrations/

  migration-test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpass
          MYSQL_DATABASE: schema_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Install Flyway
        run: |
          curl -sL https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.0.0/flyway-commandline-10.0.0-linux-x64.tar.gz | tar xz
          sudo ln -s "$(pwd)/flyway-10.0.0/flyway" /usr/local/bin/flyway

      - name: Run all migrations from scratch
        run: |
          flyway \
            -url="jdbc:mysql://127.0.0.1:3306/schema_test" \
            -user=root \
            -password=testpass \
            -locations=filesystem:db/migrations \
            migrate

      - name: Verify schema checksums
        run: |
          flyway \
            -url="jdbc:mysql://127.0.0.1:3306/schema_test" \
            -user=root \
            -password=testpass \
            validate
```

## Backward Compatibility Checks

Use `gh-ost` or `pt-online-schema-change` in test mode to validate that ALTER TABLE changes can be applied without locking:

```bash
# Test an ALTER TABLE change without actually running it
pt-online-schema-change \
  --alter "ADD INDEX idx_status (status)" \
  --host 127.0.0.1 \
  --user root \
  --password testpass \
  D=schema_test,t=orders \
  --dry-run
```

## Schema Diff Validation

Generate a diff between current production schema and proposed changes:

```bash
# Dump current production schema (structure only)
mysqldump --no-data --single-transaction \
  -h prod-db.example.com -u readonly -p myapp > /tmp/prod_schema.sql

# Apply migrations to test DB and dump
mysqldump --no-data schema_test > /tmp/new_schema.sql

# Compare
diff /tmp/prod_schema.sql /tmp/new_schema.sql
```

## Enforcing Validation in PRs

Add a required status check in your repository settings so PRs cannot be merged without passing schema validation:

```yaml
# Branch protection rule
required_status_checks:
  - syntax-check
  - migration-test
```

## Summary

Running MySQL schema validation in CI/CD involves three layers: SQL syntax checking with `sqlfluff`, migration validity testing against a real MySQL instance using Flyway, and backward compatibility checks with `pt-online-schema-change`. Making these checks required status checks on pull requests prevents schema changes from reaching production without passing automated validation.
