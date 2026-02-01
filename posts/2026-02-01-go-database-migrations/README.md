# How to Handle Database Migrations in Go Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Database, Migrations, PostgreSQL, MySQL, golang-migrate

Description: A practical guide to managing database schema migrations in Go projects using golang-migrate and goose.

---

Database migrations are one of those things that seem simple until they bite you in production. I've seen teams lose data, break deployments, and spend weekends debugging migration issues that could have been avoided with proper tooling and practices. In Go projects, we have excellent options for handling migrations - let's walk through how to do it right.

## Why You Need a Migration Tool

You might be tempted to just write raw SQL files and run them manually. Don't. Here's what goes wrong:

- No version tracking means you forget which migrations ran on which environment
- Rolling back becomes a guessing game
- Multiple developers stepping on each other's migrations
- No atomic operations when things fail halfway through

A proper migration tool gives you versioning, rollback capabilities, and a clear audit trail. In Go, the two most popular options are `golang-migrate` and `goose`. We'll focus primarily on `golang-migrate` since it's more widely adopted, but I'll cover `goose` as well since some teams prefer its approach.

## Getting Started with golang-migrate

First, install the CLI tool. On macOS:

```bash
brew install golang-migrate
```

For Linux, grab the binary from the releases page:

```bash
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/
```

You'll also want the Go library for running migrations programmatically:

```bash
go get -u github.com/golang-migrate/migrate/v4
go get -u github.com/golang-migrate/migrate/v4/database/postgres
go get -u github.com/golang-migrate/migrate/v4/source/file
```

## Migration File Naming Convention

This is where many teams mess up. golang-migrate uses a specific naming convention that you need to follow exactly:

```
{version}_{title}.up.sql
{version}_{title}.down.sql
```

The version can be a Unix timestamp or a sequential number. I recommend timestamps because they prevent merge conflicts when multiple developers create migrations simultaneously.

Create your migrations directory and your first migration:

```bash
# Create the migrations directory
mkdir -p db/migrations

# Create a new migration with timestamp versioning
migrate create -ext sql -dir db/migrations -seq create_users_table
```

This generates two files:

```
db/migrations/000001_create_users_table.up.sql
db/migrations/000001_create_users_table.down.sql
```

## Writing Up and Down Migrations

The "up" migration applies your schema change. The "down" migration reverses it. Always write both - your future self will thank you when you need to rollback a bad deployment.

Here's what the up migration looks like for creating a users table:

```sql
-- 000001_create_users_table.up.sql
-- Creates the core users table with essential fields for authentication
-- Using UUID for id to support distributed systems and prevent enumeration attacks

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for fast lookups during authentication
CREATE INDEX idx_users_email ON users(email);
```

And the corresponding down migration:

```sql
-- 000001_create_users_table.down.sql
-- Reverses the users table creation
-- WARNING: This will delete all user data - only use in development or when intentionally removing the feature

DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

A few rules I follow for writing migrations:

1. Each migration should do one thing. Don't create three tables in one migration.
2. Use `IF EXISTS` and `IF NOT EXISTS` to make migrations idempotent where possible.
3. Add comments explaining why, not just what.
4. Test your down migrations. Seriously, run them locally before committing.

## Running Migrations from the CLI

The basic commands you'll use daily:

```bash
# Apply all pending migrations
migrate -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" -path db/migrations up

# Rollback the last migration
migrate -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" -path db/migrations down 1

# Go to a specific version
migrate -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" -path db/migrations goto 3

# Check current version
migrate -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" -path db/migrations version

# Force set version (use with caution - for fixing dirty state)
migrate -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" -path db/migrations force 2
```

Pro tip: Create a Makefile to avoid typing the database URL repeatedly:

```makefile
# Makefile
DB_URL=postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

migrate-up:
	migrate -database "$(DB_URL)" -path db/migrations up

migrate-down:
	migrate -database "$(DB_URL)" -path db/migrations down 1

migrate-create:
	migrate create -ext sql -dir db/migrations -seq $(name)
```

Now you can run `make migrate-up` or `make migrate-create name=add_orders_table`.

## Embedding Migrations in Your Go Binary

For production deployments, you probably don't want to ship SQL files separately from your binary. Go 1.16 introduced `embed` which makes this trivial.

Here's how to embed your migrations and run them programmatically:

```go
// db/migrations.go
// This file handles embedding and running database migrations at application startup
// Migrations are embedded into the binary so no external files are needed in production

package db

import (
    "database/sql"
    "embed"
    "fmt"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    "github.com/golang-migrate/migrate/v4/source/iofs"
)

// Embed all SQL files from the migrations directory into the binary
// The go:embed directive includes these files at compile time
//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations executes all pending database migrations
// Returns an error if migrations fail, nil if successful or no migrations needed
func RunMigrations(db *sql.DB) error {
    // Create a source driver from the embedded filesystem
    // The "migrations" path must match the directory in the embed directive
    sourceDriver, err := iofs.New(migrationsFS, "migrations")
    if err != nil {
        return fmt.Errorf("failed to create source driver: %w", err)
    }

    // Create the postgres driver instance using the existing connection
    dbDriver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        return fmt.Errorf("failed to create database driver: %w", err)
    }

    // Initialize the migrator with both drivers
    m, err := migrate.NewWithInstance("iofs", sourceDriver, "postgres", dbDriver)
    if err != nil {
        return fmt.Errorf("failed to create migrator: %w", err)
    }

    // Run all pending migrations
    // ErrNoChange is not an error - it means we're already up to date
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        return fmt.Errorf("migration failed: %w", err)
    }

    return nil
}
```

Call this from your main function or initialization code:

```go
// main.go
// Application entry point - connects to database and runs migrations before starting the server

package main

import (
    "database/sql"
    "log"
    "os"

    _ "github.com/lib/pq"
    "yourapp/db"
)

func main() {
    // Get database URL from environment variable
    // Never hardcode credentials in your source code
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL environment variable is required")
    }

    // Open database connection
    conn, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer conn.Close()

    // Verify the connection is actually working
    if err := conn.Ping(); err != nil {
        log.Fatalf("Failed to ping database: %v", err)
    }

    // Run pending migrations before starting the application
    // This ensures the schema is always up to date
    log.Println("Running database migrations...")
    if err := db.RunMigrations(conn); err != nil {
        log.Fatalf("Migration failed: %v", err)
    }
    log.Println("Migrations completed successfully")

    // Start your application server here
    // ...
}
```

## The Goose Alternative

Some teams prefer `goose` over `golang-migrate`. The main differences:

- Goose supports Go-based migrations in addition to SQL
- Goose has a simpler versioning scheme
- golang-migrate has better support for different databases and sources

Install goose:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

Create a migration:

```bash
goose -dir db/migrations create add_orders_table sql
```

Goose uses a slightly different naming convention:

```
20240115120000_add_orders_table.sql
```

And the up/down migrations are in the same file, separated by comments:

```sql
-- +goose Up
-- Creates the orders table for tracking customer purchases
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
-- Removes the orders table - will cascade delete related data
DROP TABLE IF EXISTS orders;
```

For Go-based migrations when you need more complex logic:

```go
// db/migrations/20240115130000_seed_admin_user.go
// Seeds an initial admin user - useful for bootstrapping new environments
// Uses Go instead of SQL for password hashing logic

package migrations

import (
    "database/sql"

    "github.com/pressly/goose/v3"
    "golang.org/x/crypto/bcrypt"
)

func init() {
    goose.AddMigration(upSeedAdmin, downSeedAdmin)
}

func upSeedAdmin(tx *sql.Tx) error {
    // Hash the default password - this should be changed immediately after first login
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte("changeme"), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    _, err = tx.Exec(`
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING
    `, "admin@example.com", string(hashedPassword), "System Administrator")

    return err
}

func downSeedAdmin(tx *sql.Tx) error {
    _, err := tx.Exec(`DELETE FROM users WHERE email = $1`, "admin@example.com")
    return err
}
```

## CI/CD Integration

Running migrations in CI/CD requires some thought. Here's what works:

**For testing in CI**, run migrations against a test database before running your tests:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
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

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Install migrate
        run: |
          curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
          sudo mv migrate /usr/local/bin/

      - name: Run migrations
        run: migrate -database "postgres://test:test@localhost:5432/testdb?sslmode=disable" -path db/migrations up

      - name: Run tests
        run: go test -v ./...
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb?sslmode=disable
```

**For production deployments**, you have two options:

1. Run migrations as part of your deployment pipeline before updating the application
2. Have the application run migrations on startup (the embedded approach shown earlier)

Option 1 is safer because you can catch migration failures before they affect live traffic. Option 2 is simpler but means a failed migration could prevent your app from starting.

Here's a deployment script that runs migrations first:

```bash
#!/bin/bash
# deploy.sh
# Deploys the application with database migrations
# Migrations run first so we can rollback before updating the app if they fail

set -e  # Exit on any error

echo "Running database migrations..."
migrate -database "$DATABASE_URL" -path db/migrations up

if [ $? -ne 0 ]; then
    echo "Migration failed! Aborting deployment."
    exit 1
fi

echo "Migrations successful. Deploying application..."
# Your deployment commands here - kubectl apply, docker pull, etc.
```

## Common Pitfalls to Avoid

After running migrations in production for years, here are the mistakes I see most often:

**Not testing down migrations.** Everyone tests the up migration. Almost nobody tests down. Then production breaks and you can't rollback.

**Modifying existing migrations.** Once a migration has run in any environment, treat it as immutable. Create a new migration to make changes.

**Long-running migrations without timeouts.** Adding an index on a large table can take hours. Set statement timeouts and consider using `CREATE INDEX CONCURRENTLY` in PostgreSQL.

**Not handling partial failures.** If a migration fails halfway, your database might be in a dirty state. golang-migrate tracks this with a "dirty" flag - use `force` carefully to fix it.

**Forgetting about data migrations.** Schema migrations are straightforward. Data migrations - transforming existing data - are where things get tricky. Test these extensively with production-like data volumes.

## Wrapping Up

Database migrations don't have to be scary. With the right tooling and practices:

- Use golang-migrate or goose for version control
- Always write reversible migrations
- Embed migrations in your binary for simpler deployments
- Test both up and down migrations before deploying
- Integrate migrations into your CI/CD pipeline

Start simple, add complexity only when needed, and always have a rollback plan. Your database will thank you.

---

*Monitor your database health with [OneUptime](https://oneuptime.com) - track query performance and connection pool metrics.*
