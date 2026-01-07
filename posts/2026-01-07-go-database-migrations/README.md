# How to Implement Database Migrations in Go with golang-migrate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Database, Migrations, PostgreSQL, CI/CD, DevOps

Description: Implement robust database migrations in Go using golang-migrate with version control, rollbacks, and CI/CD pipeline integration.

---

Database migrations are essential for managing schema changes in production applications. As your application evolves, you need a reliable way to version your database schema, apply changes consistently across environments, and roll back when things go wrong. In this comprehensive guide, we will explore golang-migrate, one of the most popular migration tools in the Go ecosystem, and learn how to integrate it into your development workflow and CI/CD pipelines.

## Table of Contents

1. [Introduction to golang-migrate](#introduction-to-golang-migrate)
2. [Installation](#installation)
3. [Project Structure](#project-structure)
4. [Creating Migration Files](#creating-migration-files)
5. [Running Migrations via CLI](#running-migrations-via-cli)
6. [Running Migrations Programmatically](#running-migrations-programmatically)
7. [Rollback Strategies](#rollback-strategies)
8. [CI/CD Integration with GitHub Actions](#cicd-integration-with-github-actions)
9. [Best Practices for Production](#best-practices-for-production)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)
11. [Conclusion](#conclusion)

---

## Introduction to golang-migrate

golang-migrate is a database migration tool written in Go that supports multiple database drivers including PostgreSQL, MySQL, SQLite, MongoDB, and more. It provides both a CLI tool and a Go library for programmatic migration management.

Key features include:

- **Version-controlled migrations**: Each migration has a unique version number
- **Up and down migrations**: Support for both applying and reverting changes
- **Multiple database support**: Works with PostgreSQL, MySQL, SQLite, CockroachDB, and more
- **Multiple source drivers**: Read migrations from filesystem, GitHub, AWS S3, and others
- **Atomic migrations**: Transactions ensure migrations either complete fully or not at all
- **CLI and library**: Use from command line or embed in your Go application

---

## Installation

### Installing the CLI Tool

You can install golang-migrate CLI using several methods. Choose the one that best fits your environment.

Using Go install (requires Go 1.16+):

```bash
# Install the migrate CLI with PostgreSQL support
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# For MySQL support
go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# For multiple database support
go install -tags 'postgres mysql sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

Using Homebrew on macOS:

```bash
# Install via Homebrew
brew install golang-migrate
```

Using Docker:

```bash
# Pull the official Docker image
docker pull migrate/migrate

# Run migrations using Docker
docker run -v /path/to/migrations:/migrations \
    --network host migrate/migrate \
    -path=/migrations/ \
    -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" up
```

### Installing the Go Library

Add the golang-migrate library to your Go project for programmatic usage.

```bash
# Add the core library and PostgreSQL driver to your project
go get -u github.com/golang-migrate/migrate/v4
go get -u github.com/golang-migrate/migrate/v4/database/postgres
go get -u github.com/golang-migrate/migrate/v4/source/file
```

---

## Project Structure

A well-organized project structure makes migration management easier. Here is a recommended layout.

```
myapp/
├── cmd/
│   └── myapp/
│       └── main.go
├── internal/
│   ├── database/
│   │   ├── database.go      # Database connection logic
│   │   └── migrate.go       # Migration helper functions
│   └── models/
│       └── user.go
├── migrations/              # All migration files go here
│   ├── 000001_create_users_table.up.sql
│   ├── 000001_create_users_table.down.sql
│   ├── 000002_add_email_to_users.up.sql
│   ├── 000002_add_email_to_users.down.sql
│   ├── 000003_create_posts_table.up.sql
│   └── 000003_create_posts_table.down.sql
├── go.mod
├── go.sum
└── Makefile
```

---

## Creating Migration Files

Migration files come in pairs: an "up" file that applies the change and a "down" file that reverts it. The naming convention is critical for proper ordering.

### Naming Convention

Migration files follow this pattern:

```
{version}_{description}.up.sql
{version}_{description}.down.sql
```

The version can be a sequential number or a timestamp. Sequential numbers are simpler, while timestamps help avoid conflicts in team environments.

### Creating Migrations via CLI

Use the migrate CLI to create new migration files with the correct naming.

```bash
# Create a new migration with sequential versioning
migrate create -ext sql -dir migrations -seq create_users_table

# This creates:
# migrations/000001_create_users_table.up.sql
# migrations/000001_create_users_table.down.sql

# Create a migration with timestamp versioning
migrate create -ext sql -dir migrations create_posts_table

# This creates:
# migrations/20260107120000_create_posts_table.up.sql
# migrations/20260107120000_create_posts_table.down.sql
```

### Example Migration: Creating Users Table

The up migration creates the table with all necessary columns and constraints.

```sql
-- migrations/000001_create_users_table.up.sql
-- Create the users table with primary key and timestamps
-- Using UUID for better distributed system compatibility

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups during authentication
CREATE INDEX idx_users_email ON users(email);

-- Create index on username for profile lookups
CREATE INDEX idx_users_username ON users(username);
```

The down migration reverses all changes made by the up migration.

```sql
-- migrations/000001_create_users_table.down.sql
-- Revert the users table creation
-- Drop indexes first, then the table

DROP INDEX IF EXISTS idx_users_username;
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

### Example Migration: Adding Columns

When adding new columns, consider default values and constraints carefully.

```sql
-- migrations/000002_add_profile_fields_to_users.up.sql
-- Add profile-related fields to the users table
-- Using nullable columns to avoid breaking existing records

ALTER TABLE users
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN avatar_url TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN phone VARCHAR(20);

-- Create a computed full_name column for convenience
ALTER TABLE users
ADD COLUMN full_name VARCHAR(201) GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
) STORED;
```

The down migration removes the added columns in reverse order.

```sql
-- migrations/000002_add_profile_fields_to_users.down.sql
-- Remove profile fields from users table
-- Drop in reverse order of addition

ALTER TABLE users
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS avatar_url,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS first_name;
```

### Example Migration: Creating Related Tables

This migration creates a posts table with a foreign key relationship to users.

```sql
-- migrations/000003_create_posts_table.up.sql
-- Create posts table with foreign key to users
-- Includes soft delete support via deleted_at column

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for user's posts lookup
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Index for published posts queries
CREATE INDEX idx_posts_status_published ON posts(status, published_at)
    WHERE deleted_at IS NULL;

-- Index for slug lookups (used in URLs)
CREATE INDEX idx_posts_slug ON posts(slug);
```

```sql
-- migrations/000003_create_posts_table.down.sql
-- Remove posts table and all related indexes

DROP INDEX IF EXISTS idx_posts_slug;
DROP INDEX IF EXISTS idx_posts_status_published;
DROP INDEX IF EXISTS idx_posts_user_id;
DROP TABLE IF EXISTS posts;
```

---

## Running Migrations via CLI

The migrate CLI provides commands for applying, reverting, and managing migrations.

### Basic Migration Commands

These are the most commonly used CLI commands for migration management.

```bash
# Apply all pending migrations
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" up

# Apply only the next N migrations
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" up 2

# Revert the last migration
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" down 1

# Revert all migrations (use with caution!)
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" down

# Go to a specific version
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" goto 3

# Check current migration version
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" version

# Force set version (useful for fixing dirty state)
migrate -path ./migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" force 3
```

### Using Environment Variables

Environment variables keep sensitive connection strings out of command history.

```bash
# Set the database URL as an environment variable
export DATABASE_URL="postgres://user:password@localhost:5432/myapp?sslmode=disable"

# Now run migrations without exposing credentials
migrate -path ./migrations -database "$DATABASE_URL" up
```

### Creating a Makefile for Convenience

A Makefile simplifies common migration tasks and ensures consistency across team members.

```makefile
# Makefile for database migration management

# Database connection string (override with environment variable)
DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/myapp?sslmode=disable
MIGRATIONS_PATH = ./migrations

# Install migrate CLI tool
.PHONY: install-migrate
install-migrate:
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create a new migration file pair
# Usage: make create-migration name=create_users_table
.PHONY: create-migration
create-migration:
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(name)

# Apply all pending migrations
.PHONY: migrate-up
migrate-up:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" up

# Apply N migrations
# Usage: make migrate-up-n n=2
.PHONY: migrate-up-n
migrate-up-n:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" up $(n)

# Revert the last migration
.PHONY: migrate-down
migrate-down:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" down 1

# Revert N migrations
# Usage: make migrate-down-n n=2
.PHONY: migrate-down-n
migrate-down-n:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" down $(n)

# Revert all migrations (dangerous!)
.PHONY: migrate-reset
migrate-reset:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" down

# Show current migration version
.PHONY: migrate-version
migrate-version:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" version

# Force set migration version (fixes dirty state)
# Usage: make migrate-force version=3
.PHONY: migrate-force
migrate-force:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" force $(version)

# Go to specific version
# Usage: make migrate-goto version=5
.PHONY: migrate-goto
migrate-goto:
	migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" goto $(version)
```

---

## Running Migrations Programmatically

Embedding migrations in your Go application provides more control and enables automated deployment scenarios.

### Basic Programmatic Migration

This example shows the fundamental approach to running migrations from Go code.

```go
// internal/database/migrate.go
package database

import (
	"errors"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	// Import the PostgreSQL driver for database connections
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	// Import the file source driver to read migrations from filesystem
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations applies all pending database migrations
// It returns an error if migration fails (except for "no change" which is not an error)
func RunMigrations(databaseURL, migrationsPath string) error {
	// Create a new migrate instance with the migrations path and database URL
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		databaseURL,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// Apply all pending migrations
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Log the current version after migration
	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		log.Printf("Warning: Database is in dirty state at version %d", version)
	} else {
		log.Printf("Database migrated to version %d", version)
	}

	return nil
}
```

### Embedding Migrations in Binary

Using Go's embed package, you can include migration files directly in your compiled binary. This eliminates deployment dependencies on external files.

```go
// internal/database/embedded_migrations.go
package database

import (
	"embed"
	"errors"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// Embed all SQL migration files into the binary
// This makes the binary self-contained and deployment simpler
//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunEmbeddedMigrations applies migrations from the embedded filesystem
// This is ideal for containerized deployments where you want a single artifact
func RunEmbeddedMigrations(databaseURL string) error {
	// Create a source driver from the embedded filesystem
	sourceDriver, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to create source driver: %w", err)
	}

	// Create migrate instance using the source driver
	m, err := migrate.NewWithSourceInstance("iofs", sourceDriver, databaseURL)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// Apply all pending migrations
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	version, _, _ := m.Version()
	log.Printf("Migrations completed. Current version: %d", version)

	return nil
}
```

### Advanced Migration Manager

This comprehensive migration manager provides full control over the migration lifecycle.

```go
// internal/database/migration_manager.go
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// MigrationManager handles all database migration operations
// It provides methods for up, down, goto, and version checking
type MigrationManager struct {
	db             *sql.DB
	migrationsPath string
	migrate        *migrate.Migrate
}

// NewMigrationManager creates a new migration manager instance
// It initializes the underlying migrate library with the provided database connection
func NewMigrationManager(db *sql.DB, migrationsPath string) (*MigrationManager, error) {
	// Create the postgres driver instance from the existing connection
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres driver: %w", err)
	}

	// Create migrate instance with file source and postgres driver
	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create migrate instance: %w", err)
	}

	return &MigrationManager{
		db:             db,
		migrationsPath: migrationsPath,
		migrate:        m,
	}, nil
}

// Up applies all pending migrations
func (mm *MigrationManager) Up() error {
	log.Println("Applying all pending migrations...")

	if err := mm.migrate.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("No pending migrations to apply")
			return nil
		}
		return fmt.Errorf("migration up failed: %w", err)
	}

	version, _, _ := mm.Version()
	log.Printf("Successfully migrated to version %d", version)
	return nil
}

// UpN applies the next n migrations
func (mm *MigrationManager) UpN(n int) error {
	log.Printf("Applying next %d migrations...", n)

	if err := mm.migrate.Steps(n); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("No pending migrations to apply")
			return nil
		}
		return fmt.Errorf("migration up %d steps failed: %w", n, err)
	}

	return nil
}

// Down reverts the last n migrations
func (mm *MigrationManager) Down(n int) error {
	log.Printf("Reverting last %d migrations...", n)

	if err := mm.migrate.Steps(-n); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("No migrations to revert")
			return nil
		}
		return fmt.Errorf("migration down %d steps failed: %w", n, err)
	}

	return nil
}

// Goto migrates to a specific version
// If the target version is lower than current, it will revert migrations
func (mm *MigrationManager) Goto(version uint) error {
	log.Printf("Migrating to version %d...", version)

	if err := mm.migrate.Migrate(version); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Printf("Already at version %d", version)
			return nil
		}
		return fmt.Errorf("migration to version %d failed: %w", version, err)
	}

	return nil
}

// Version returns the current migration version and dirty state
func (mm *MigrationManager) Version() (uint, bool, error) {
	version, dirty, err := mm.migrate.Version()
	if err != nil {
		if errors.Is(err, migrate.ErrNilVersion) {
			return 0, false, nil
		}
		return 0, false, err
	}
	return version, dirty, nil
}

// Force sets the migration version without running migrations
// Use this to fix a dirty database state
func (mm *MigrationManager) Force(version int) error {
	log.Printf("Forcing migration version to %d...", version)
	return mm.migrate.Force(version)
}

// Close cleans up the migration manager resources
func (mm *MigrationManager) Close() error {
	sourceErr, dbErr := mm.migrate.Close()
	if sourceErr != nil {
		return sourceErr
	}
	return dbErr
}

// MigrateWithLock runs migrations with an advisory lock to prevent concurrent runs
// This is essential for multi-instance deployments
func (mm *MigrationManager) MigrateWithLock(ctx context.Context) error {
	const lockID = 12345 // Choose a unique lock ID for your application

	// Acquire advisory lock
	var locked bool
	err := mm.db.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", lockID).Scan(&locked)
	if err != nil {
		return fmt.Errorf("failed to acquire advisory lock: %w", err)
	}

	if !locked {
		log.Println("Another migration is in progress, skipping...")
		return nil
	}

	// Ensure lock is released when done
	defer func() {
		_, _ = mm.db.ExecContext(ctx, "SELECT pg_advisory_unlock($1)", lockID)
	}()

	// Run migrations
	return mm.Up()
}
```

### Using the Migration Manager in Your Application

Here is how to integrate the migration manager into your application startup.

```go
// cmd/myapp/main.go
package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
	"myapp/internal/database"
)

func main() {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Establish database connection with retry logic
	db, err := connectWithRetry(databaseURL, 5, 5*time.Second)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Create migration manager
	migrationManager, err := database.NewMigrationManager(db, "./migrations")
	if err != nil {
		log.Fatalf("Failed to create migration manager: %v", err)
	}
	defer migrationManager.Close()

	// Run migrations with advisory lock (safe for multi-instance deployments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := migrationManager.MigrateWithLock(ctx); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Continue with application startup...
	log.Println("Application starting...")
}

// connectWithRetry attempts to connect to the database with exponential backoff
// This is useful in containerized environments where the database may not be ready immediately
func connectWithRetry(url string, maxAttempts int, delay time.Duration) (*sql.DB, error) {
	var db *sql.DB
	var err error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		db, err = sql.Open("postgres", url)
		if err != nil {
			log.Printf("Attempt %d: Failed to open database: %v", attempt, err)
			time.Sleep(delay)
			continue
		}

		err = db.Ping()
		if err != nil {
			log.Printf("Attempt %d: Failed to ping database: %v", attempt, err)
			db.Close()
			time.Sleep(delay)
			continue
		}

		log.Println("Successfully connected to database")
		return db, nil
	}

	return nil, err
}
```

---

## Rollback Strategies

Having a solid rollback strategy is crucial for production deployments. Here are different approaches for various scenarios.

### Manual Rollback via CLI

For immediate rollback needs, use the CLI directly.

```bash
# Check current version first
migrate -path ./migrations -database "$DATABASE_URL" version

# Rollback one migration
migrate -path ./migrations -database "$DATABASE_URL" down 1

# Rollback to a specific version
migrate -path ./migrations -database "$DATABASE_URL" goto 5

# Verify the rollback
migrate -path ./migrations -database "$DATABASE_URL" version
```

### Automated Rollback on Failure

This pattern automatically rolls back if the migration fails during deployment.

```go
// internal/database/safe_migrate.go
package database

import (
	"errors"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// SafeMigration handles migrations with automatic rollback on failure
type SafeMigration struct {
	migrate        *migrate.Migrate
	startVersion   uint
	currentVersion uint
}

// NewSafeMigration creates a new safe migration instance
func NewSafeMigration(migrationsPath, databaseURL string) (*SafeMigration, error) {
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		databaseURL,
	)
	if err != nil {
		return nil, err
	}

	version, _, _ := m.Version()

	return &SafeMigration{
		migrate:        m,
		startVersion:   version,
		currentVersion: version,
	}, nil
}

// MigrateWithRollback applies migrations and rolls back if any step fails
func (sm *SafeMigration) MigrateWithRollback() error {
	defer sm.migrate.Close()

	log.Printf("Starting migration from version %d", sm.startVersion)

	// Apply migrations one at a time for granular rollback
	for {
		// Apply next migration
		err := sm.migrate.Steps(1)

		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("All migrations applied successfully")
			break
		}

		if err != nil {
			log.Printf("Migration failed: %v", err)
			return sm.rollbackToStart()
		}

		// Update current version
		sm.currentVersion, _, _ = sm.migrate.Version()
		log.Printf("Successfully applied migration to version %d", sm.currentVersion)
	}

	return nil
}

// rollbackToStart reverts all migrations applied in this session
func (sm *SafeMigration) rollbackToStart() error {
	if sm.currentVersion == sm.startVersion {
		return errors.New("migration failed, no rollback needed")
	}

	log.Printf("Rolling back from version %d to %d", sm.currentVersion, sm.startVersion)

	// Calculate steps to rollback
	steps := int(sm.startVersion) - int(sm.currentVersion)

	if err := sm.migrate.Steps(steps); err != nil {
		return fmt.Errorf("rollback failed: %w (manual intervention required)", err)
	}

	log.Printf("Successfully rolled back to version %d", sm.startVersion)
	return errors.New("migration failed, rolled back to previous version")
}
```

### Blue-Green Deployment Migration Strategy

For zero-downtime deployments, use backward-compatible migrations.

```go
// internal/database/bluegreen.go
package database

import (
	"database/sql"
	"fmt"
	"log"
)

// BlueGreenMigrator handles migrations compatible with blue-green deployments
// All migrations must be backward compatible during the transition period
type BlueGreenMigrator struct {
	db *sql.DB
}

// NewBlueGreenMigrator creates a new blue-green migration handler
func NewBlueGreenMigrator(db *sql.DB) *BlueGreenMigrator {
	return &BlueGreenMigrator{db: db}
}

// PrepareMigration runs preparation steps before the main migration
// Example: Add new columns as nullable before making them required
func (bg *BlueGreenMigrator) PrepareMigration(migrationName string) error {
	log.Printf("Preparing migration: %s", migrationName)

	// Add your preparation logic here
	// This typically involves adding new columns as nullable

	return nil
}

// CompleteMigration runs cleanup after blue-green switch
// Example: Drop old columns, add NOT NULL constraints
func (bg *BlueGreenMigrator) CompleteMigration(migrationName string) error {
	log.Printf("Completing migration: %s", migrationName)

	// Add your completion logic here
	// This typically involves adding constraints and dropping old structures

	return nil
}

// ValidateBackwardCompatibility checks if the migration is backward compatible
func (bg *BlueGreenMigrator) ValidateBackwardCompatibility(upSQL string) error {
	// List of operations that break backward compatibility
	breakingPatterns := []string{
		"DROP COLUMN",
		"DROP TABLE",
		"ALTER COLUMN.*NOT NULL",
		"RENAME COLUMN",
		"RENAME TABLE",
	}

	for _, pattern := range breakingPatterns {
		// In production, use proper SQL parsing
		// This is a simplified check for illustration
		log.Printf("Checking for breaking pattern: %s", pattern)
	}

	return nil
}
```

---

## CI/CD Integration with GitHub Actions

Integrating migrations into your CI/CD pipeline ensures consistent database states across environments.

### Complete GitHub Actions Workflow

This workflow runs migrations as part of your deployment pipeline.

```yaml
# .github/workflows/deploy.yml
name: Deploy with Migrations

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  GO_VERSION: '1.22'
  MIGRATE_VERSION: 'v4.17.0'

jobs:
  # Run tests including migration tests
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Install migrate CLI
        run: |
          curl -L https://github.com/golang-migrate/migrate/releases/download/${{ env.MIGRATE_VERSION }}/migrate.linux-amd64.tar.gz | tar xvz
          sudo mv migrate /usr/local/bin/migrate
          migrate -version

      - name: Run migrations on test database
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db?sslmode=disable
        run: |
          migrate -path ./migrations -database "$DATABASE_URL" up

      - name: Run tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db?sslmode=disable
        run: go test -v -race -coverprofile=coverage.out ./...

      - name: Test migration rollback
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db?sslmode=disable
        run: |
          # Test that all migrations can be rolled back
          migrate -path ./migrations -database "$DATABASE_URL" down
          # And reapplied
          migrate -path ./migrations -database "$DATABASE_URL" up

  # Validate migration files
  validate-migrations:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Check migration file naming
        run: |
          # Ensure all migration files follow naming convention
          for file in migrations/*.sql; do
            if [[ ! $file =~ ^migrations/[0-9]+_[a-z_]+\.(up|down)\.sql$ ]]; then
              echo "Invalid migration filename: $file"
              exit 1
            fi
          done
          echo "All migration filenames are valid"

      - name: Check migration pairs
        run: |
          # Ensure every up migration has a corresponding down migration
          cd migrations
          for up_file in *.up.sql; do
            down_file="${up_file%.up.sql}.down.sql"
            if [[ ! -f "$down_file" ]]; then
              echo "Missing down migration for: $up_file"
              exit 1
            fi
          done
          echo "All migrations have up/down pairs"

  # Deploy to staging
  deploy-staging:
    needs: [test, validate-migrations]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install migrate CLI
        run: |
          curl -L https://github.com/golang-migrate/migrate/releases/download/${{ env.MIGRATE_VERSION }}/migrate.linux-amd64.tar.gz | tar xvz
          sudo mv migrate /usr/local/bin/migrate

      - name: Run migrations on staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          echo "Running migrations on staging..."
          migrate -path ./migrations -database "$DATABASE_URL" up

          # Verify migration version
          VERSION=$(migrate -path ./migrations -database "$DATABASE_URL" version 2>&1)
          echo "Staging database now at version: $VERSION"

      - name: Deploy application
        run: |
          echo "Deploying application to staging..."
          # Add your deployment commands here

  # Deploy to production
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install migrate CLI
        run: |
          curl -L https://github.com/golang-migrate/migrate/releases/download/${{ env.MIGRATE_VERSION }}/migrate.linux-amd64.tar.gz | tar xvz
          sudo mv migrate /usr/local/bin/migrate

      - name: Get current production version
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        id: current-version
        run: |
          VERSION=$(migrate -path ./migrations -database "$DATABASE_URL" version 2>&1 || echo "0")
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Current production version: $VERSION"

      - name: Run migrations on production
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          echo "Running migrations on production..."
          migrate -path ./migrations -database "$DATABASE_URL" up

      - name: Verify migration success
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          NEW_VERSION=$(migrate -path ./migrations -database "$DATABASE_URL" version 2>&1)
          echo "Production database now at version: $NEW_VERSION"

          # Check for dirty state
          if [[ "$NEW_VERSION" == *"dirty"* ]]; then
            echo "ERROR: Database is in dirty state!"
            exit 1
          fi

      - name: Deploy application
        run: |
          echo "Deploying application to production..."
          # Add your deployment commands here

      - name: Notify on failure
        if: failure()
        run: |
          echo "Migration or deployment failed!"
          echo "Previous version was: ${{ steps.current-version.outputs.version }}"
          # Add notification logic (Slack, email, etc.)
```

### Migration-Only Workflow

A dedicated workflow for running migrations manually when needed.

```yaml
# .github/workflows/run-migration.yml
name: Run Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to run migration on'
        required: true
        type: choice
        options:
          - staging
          - production
      action:
        description: 'Migration action'
        required: true
        type: choice
        options:
          - up
          - down
          - version
          - goto
      steps:
        description: 'Number of steps (for up/down) or version (for goto)'
        required: false
        default: ''

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install migrate CLI
        run: |
          curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.0/migrate.linux-amd64.tar.gz | tar xvz
          sudo mv migrate /usr/local/bin/migrate

      - name: Get current version
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Current database version:"
          migrate -path ./migrations -database "$DATABASE_URL" version || true

      - name: Run migration action
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ACTION="${{ github.event.inputs.action }}"
          STEPS="${{ github.event.inputs.steps }}"

          case $ACTION in
            "up")
              if [ -n "$STEPS" ]; then
                migrate -path ./migrations -database "$DATABASE_URL" up $STEPS
              else
                migrate -path ./migrations -database "$DATABASE_URL" up
              fi
              ;;
            "down")
              if [ -n "$STEPS" ]; then
                migrate -path ./migrations -database "$DATABASE_URL" down $STEPS
              else
                echo "ERROR: Steps required for down migration"
                exit 1
              fi
              ;;
            "version")
              migrate -path ./migrations -database "$DATABASE_URL" version
              ;;
            "goto")
              if [ -n "$STEPS" ]; then
                migrate -path ./migrations -database "$DATABASE_URL" goto $STEPS
              else
                echo "ERROR: Version required for goto"
                exit 1
              fi
              ;;
          esac

      - name: Show final version
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Final database version:"
          migrate -path ./migrations -database "$DATABASE_URL" version
```

---

## Best Practices for Production

Following these best practices will help you maintain a reliable migration process in production environments.

### 1. Always Write Reversible Migrations

Every migration should have a working down migration that completely reverses the up migration.

```sql
-- GOOD: Reversible migration
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down
ALTER TABLE users DROP COLUMN phone;


-- BAD: Irreversible migration (data loss)
-- Up
ALTER TABLE users DROP COLUMN legacy_data;

-- Down
-- Cannot restore the data!
ALTER TABLE users ADD COLUMN legacy_data TEXT;
```

### 2. Make Migrations Idempotent

Use IF EXISTS and IF NOT EXISTS to prevent errors when migrations run multiple times.

```sql
-- Good: Idempotent migration
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- In down migration
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

### 3. Use Transactions Carefully

PostgreSQL supports transactional DDL, but be aware of locking implications.

```sql
-- For PostgreSQL, migrations run in transactions by default
-- For large tables, consider breaking into smaller changes

-- Instead of one large migration:
-- ALTER TABLE large_table ADD COLUMN a, ADD COLUMN b, ADD COLUMN c;

-- Use multiple smaller migrations:
-- Migration 1
ALTER TABLE large_table ADD COLUMN a VARCHAR(50);

-- Migration 2
ALTER TABLE large_table ADD COLUMN b VARCHAR(50);

-- Migration 3
ALTER TABLE large_table ADD COLUMN c VARCHAR(50);
```

### 4. Handle Large Table Migrations

For tables with millions of rows, use techniques to minimize locking.

```sql
-- migrations/000010_add_index_concurrently.up.sql
-- Create index concurrently to avoid locking the table
-- Note: This cannot run inside a transaction

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at
ON posts(created_at);
```

```sql
-- migrations/000010_add_index_concurrently.down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_posts_created_at;
```

### 5. Version Your Schema Alongside Code

Keep migrations in the same repository as your application code.

```go
// internal/database/version.go
package database

import (
	"embed"
	"fmt"
)

//go:embed migrations/*.sql
var Migrations embed.FS

// ExpectedVersion is the migration version this code expects
// Update this when adding new migrations
const ExpectedVersion uint = 10

// ValidateSchemaVersion checks if the database schema matches the expected version
func ValidateSchemaVersion(currentVersion uint) error {
	if currentVersion < ExpectedVersion {
		return fmt.Errorf(
			"database schema version %d is behind expected version %d, run migrations",
			currentVersion, ExpectedVersion,
		)
	}
	if currentVersion > ExpectedVersion {
		return fmt.Errorf(
			"database schema version %d is ahead of expected version %d, update application",
			currentVersion, ExpectedVersion,
		)
	}
	return nil
}
```

### 6. Implement Migration Locking

Prevent concurrent migration runs in multi-instance deployments.

```go
// internal/database/lock.go
package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// MigrationLock provides distributed locking for migrations
type MigrationLock struct {
	db     *sql.DB
	lockID int64
}

// NewMigrationLock creates a new migration lock
func NewMigrationLock(db *sql.DB) *MigrationLock {
	return &MigrationLock{
		db:     db,
		lockID: 987654321, // Use a unique ID for your application
	}
}

// Acquire attempts to acquire the migration lock with timeout
func (ml *MigrationLock) Acquire(ctx context.Context, timeout time.Duration) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Try to acquire lock with timeout
	var acquired bool
	err := ml.db.QueryRowContext(
		ctx,
		"SELECT pg_try_advisory_lock($1)",
		ml.lockID,
	).Scan(&acquired)

	if err != nil {
		return false, fmt.Errorf("failed to acquire lock: %w", err)
	}

	return acquired, nil
}

// Release releases the migration lock
func (ml *MigrationLock) Release(ctx context.Context) error {
	_, err := ml.db.ExecContext(
		ctx,
		"SELECT pg_advisory_unlock($1)",
		ml.lockID,
	)
	return err
}

// WithLock executes a function while holding the migration lock
func (ml *MigrationLock) WithLock(ctx context.Context, timeout time.Duration, fn func() error) error {
	acquired, err := ml.Acquire(ctx, timeout)
	if err != nil {
		return err
	}
	if !acquired {
		return fmt.Errorf("could not acquire migration lock within %v", timeout)
	}
	defer ml.Release(ctx)

	return fn()
}
```

### 7. Log Migration Activity

Maintain an audit trail of all migration runs.

```sql
-- migrations/000001_create_migration_audit.up.sql
-- Create audit table for tracking migration history
CREATE TABLE IF NOT EXISTS migration_audit (
    id SERIAL PRIMARY KEY,
    version INTEGER NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_by VARCHAR(255),
    duration_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT
);

CREATE INDEX idx_migration_audit_version ON migration_audit(version);
CREATE INDEX idx_migration_audit_executed_at ON migration_audit(executed_at);
```

---

## Troubleshooting Common Issues

### Dirty Database State

A dirty state occurs when a migration fails midway. Here is how to recover.

```bash
# Check current state
migrate -path ./migrations -database "$DATABASE_URL" version
# Output: 5 (dirty)

# Option 1: Fix the issue and force to the failed version
# Then retry the migration
migrate -path ./migrations -database "$DATABASE_URL" force 4
migrate -path ./migrations -database "$DATABASE_URL" up

# Option 2: If migration partially applied, manually fix the database
# then force to the correct version
psql "$DATABASE_URL" -c "-- Fix the partial migration manually"
migrate -path ./migrations -database "$DATABASE_URL" force 5
```

### Migration File Checksum Mismatch

This happens when migration files are modified after being applied.

```bash
# Never modify applied migrations!
# Instead, create a new migration to fix the issue

# If you must fix a checksum error in development:
# 1. Drop the schema_migrations table (development only!)
psql "$DATABASE_URL" -c "DROP TABLE schema_migrations;"

# 2. Rerun all migrations
migrate -path ./migrations -database "$DATABASE_URL" up
```

### Handling Failed Deployments

Script to help recover from failed deployment migrations.

```bash
#!/bin/bash
# scripts/recover_migration.sh

set -e

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
MIGRATIONS_PATH="${MIGRATIONS_PATH:-./migrations}"
TARGET_VERSION="${1:?Target version is required}"

echo "Current migration state:"
migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version || true

echo ""
echo "Forcing to version $TARGET_VERSION..."
migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" force "$TARGET_VERSION"

echo ""
echo "New migration state:"
migrate -path "$MIGRATIONS_PATH" -database "$DATABASE_URL" version
```

---

## Conclusion

Database migrations are a critical part of maintaining production applications. With golang-migrate, you get a powerful and flexible tool that integrates well with Go applications and CI/CD pipelines. Key takeaways from this guide:

1. **Structure matters**: Organize your migrations with consistent naming and pair every up migration with a down migration.

2. **Automate everything**: Use CI/CD pipelines to validate, test, and apply migrations automatically.

3. **Plan for failure**: Implement rollback strategies and test them regularly in non-production environments.

4. **Lock concurrent runs**: In multi-instance deployments, use advisory locks to prevent race conditions.

5. **Keep migrations small**: Smaller, focused migrations are easier to understand, test, and roll back.

6. **Version control**: Keep your migrations in the same repository as your application code for consistency.

By following these practices, you will have a robust database migration system that scales with your application and supports safe, reliable deployments.

## Additional Resources

- [golang-migrate GitHub Repository](https://github.com/golang-migrate/migrate)
- [PostgreSQL DDL Transaction Support](https://wiki.postgresql.org/wiki/Transactional_DDL_in_PostgreSQL:_A_Competitive_Analysis)
- [Database Migration Best Practices](https://martinfowler.com/articles/evodb.html)
