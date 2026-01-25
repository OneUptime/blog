# How to Manage Database Migrations with Flyway in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Flyway, Database Migration, Schema

Description: Learn how to implement reliable database migrations in Spring Boot applications using Flyway. This guide covers setup, migration scripts, versioning strategies, and best practices for production deployments.

---

> Database schema changes are one of the trickiest parts of deploying applications. Without proper migration tooling, you end up with manual SQL scripts, inconsistent environments, and late-night debugging sessions. Flyway solves this by bringing version control to your database.

I have worked on projects where database changes were handled through a shared document listing SQL statements to run. It was chaos. Migrations got skipped, columns were named differently across environments, and rollbacks were guesswork. Flyway changed that by making database migrations as predictable as code deployments.

---

## Why Flyway?

Flyway is a database migration tool that tracks which changes have been applied and ensures they run in the correct order. It stores migration history in a schema_history table, so you always know the current state of your database.

Here is what makes Flyway practical:

- **Version tracking** - Each migration has a version number, and Flyway only runs migrations that have not been applied yet
- **Repeatable migrations** - For views, stored procedures, or reference data that you want to recreate on every deployment
- **Checksum validation** - Flyway detects if someone modified an already-applied migration, preventing silent schema drift
- **Multiple database support** - Works with PostgreSQL, MySQL, Oracle, SQL Server, and many others

---

## Setting Up Flyway in Spring Boot

### Adding Dependencies

Add the Flyway dependency to your `pom.xml`. Spring Boot auto-configures Flyway when it detects the dependency on the classpath.

```xml
<!-- pom.xml -->
<dependencies>
    <!-- Spring Boot Starter for JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Flyway Core - database migration tool -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <!-- PostgreSQL driver - swap for your database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

For Gradle projects, add these to your `build.gradle`:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.flywaydb:flyway-core'
    runtimeOnly 'org.postgresql:postgresql'
}
```

### Configuration

Configure Flyway in your `application.yml`. The defaults work for most cases, but here are the common settings you might need to adjust.

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}

  flyway:
    # Enable Flyway migrations (enabled by default)
    enabled: true

    # Location of migration scripts
    locations: classpath:db/migration

    # Baseline version for existing databases
    baseline-on-migrate: true
    baseline-version: 0

    # Validate that applied migrations match local files
    validate-on-migrate: true

    # Table name for migration history
    table: flyway_schema_history

    # Fail if migrations are out of order
    out-of-order: false
```

---

## Writing Migration Scripts

### Naming Convention

Flyway uses a specific naming convention for migration files. Place them in `src/main/resources/db/migration/`.

```
V{version}__{description}.sql
```

- **V** - Prefix for versioned migrations
- **version** - Version number (e.g., 1, 1.1, 20240125)
- **__** - Double underscore separator
- **description** - Descriptive name with underscores

Examples:
- `V1__create_users_table.sql`
- `V2__add_email_to_users.sql`
- `V3__create_orders_table.sql`

### Your First Migration

Create the initial schema migration to set up your users table.

```sql
-- V1__create_users_table.sql
-- Initial schema: Create the users table with essential fields

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups during authentication
CREATE INDEX idx_users_email ON users(email);

-- Add a comment explaining the table purpose
COMMENT ON TABLE users IS 'Application user accounts';
```

### Adding Columns

When you need to add a new column, create a new migration file with the next version number.

```sql
-- V2__add_user_status.sql
-- Add account status field to support account activation and suspension

ALTER TABLE users
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;

-- Create index for filtering by status in admin queries
CREATE INDEX idx_users_status ON users(status);

-- Add check constraint to enforce valid status values
ALTER TABLE users
ADD CONSTRAINT chk_user_status
CHECK (status IN ('pending', 'active', 'suspended', 'deleted'));
```

### Creating Related Tables

Add new tables that reference existing ones.

```sql
-- V3__create_orders_table.sql
-- Order management schema with foreign key to users

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user order history lookups
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index for order status filtering
CREATE INDEX idx_orders_status ON orders(status);

-- Composite index for common query pattern
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

---

## Handling Data Migrations

Sometimes you need to transform existing data, not just schema. Be careful with data migrations since they can be slow on large tables.

```sql
-- V4__normalize_user_emails.sql
-- Convert all email addresses to lowercase for consistent lookups

-- Update existing data
UPDATE users
SET email = LOWER(email)
WHERE email != LOWER(email);

-- Add a trigger to enforce lowercase on future inserts and updates
CREATE OR REPLACE FUNCTION normalize_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email = LOWER(NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_user_email
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION normalize_email();
```

---

## Repeatable Migrations

For database objects that you want to recreate on every change, use repeatable migrations. These are prefixed with `R__` instead of `V{version}__`.

```sql
-- R__create_user_statistics_view.sql
-- Repeatable migration: recreated whenever the file content changes

CREATE OR REPLACE VIEW user_statistics AS
SELECT
    u.id AS user_id,
    u.email,
    u.status,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS lifetime_value,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.email, u.status;

-- Grant read access to the reporting role
GRANT SELECT ON user_statistics TO reporting_role;
```

Repeatable migrations run after all versioned migrations and rerun whenever their checksum changes.

---

## Java-Based Migrations

For complex migrations that need conditional logic or external data, you can write migrations in Java.

```java
// V5__populate_default_roles.java
package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.sql.PreparedStatement;
import java.sql.Statement;

/**
 * Java migration to populate default application roles.
 * Use Java migrations when you need conditional logic or external data.
 */
public class V5__populate_default_roles extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        // Create the roles table first
        try (Statement stmt = context.getConnection().createStatement()) {
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS roles (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """);
        }

        // Insert default roles using prepared statement
        String[] roles = {"admin", "user", "moderator", "guest"};
        String[] descriptions = {
            "Full system access",
            "Standard user access",
            "Content moderation access",
            "Read-only access"
        };

        String sql = "INSERT INTO roles (name, description) VALUES (?, ?) " +
                     "ON CONFLICT (name) DO NOTHING";

        try (PreparedStatement ps = context.getConnection().prepareStatement(sql)) {
            for (int i = 0; i < roles.length; i++) {
                ps.setString(1, roles[i]);
                ps.setString(2, descriptions[i]);
                ps.executeUpdate();
            }
        }
    }
}
```

---

## Testing Migrations

Test your migrations against a real database to catch errors early. Use Testcontainers to spin up a database for integration tests.

```java
// FlywayMigrationTest.java
package com.example.app;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test to verify all migrations apply successfully.
 * Uses Testcontainers to run against a real PostgreSQL instance.
 */
@Testcontainers
class FlywayMigrationTest {

    // Start a PostgreSQL container for testing
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Test
    void migrationsApplySuccessfully() {
        // Configure Flyway to use the test container
        Flyway flyway = Flyway.configure()
                .dataSource(
                    postgres.getJdbcUrl(),
                    postgres.getUsername(),
                    postgres.getPassword()
                )
                .locations("classpath:db/migration")
                .load();

        // Run all migrations
        var result = flyway.migrate();

        // Verify migrations completed without errors
        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isGreaterThan(0);

        // Log applied migrations for debugging
        System.out.println("Applied " + result.migrationsExecuted + " migrations");
    }

    @Test
    void migrationValidationPasses() {
        Flyway flyway = Flyway.configure()
                .dataSource(
                    postgres.getJdbcUrl(),
                    postgres.getUsername(),
                    postgres.getPassword()
                )
                .locations("classpath:db/migration")
                .load();

        // Apply migrations first
        flyway.migrate();

        // Validate that applied migrations match local files
        // This catches accidental modifications to applied migrations
        flyway.validate();
    }
}
```

---

## Production Deployment Tips

### Separate Schema and Data Migrations

Keep schema changes and data migrations in separate files. Schema changes are usually fast, but data migrations can lock tables for extended periods.

```sql
-- V6__add_phone_to_users.sql (schema only - fast)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX idx_users_phone ON users(phone);

-- V7__backfill_phone_numbers.sql (data migration - potentially slow)
-- Run during low-traffic periods
UPDATE users
SET phone = legacy_phone
FROM user_profiles
WHERE users.id = user_profiles.user_id
  AND users.phone IS NULL;
```

### Use Transactions Wisely

Flyway wraps each migration in a transaction by default. For DDL statements that cannot run in transactions (like `CREATE INDEX CONCURRENTLY` in PostgreSQL), disable transactions for that migration.

```sql
-- V8__add_index_concurrently.sql
-- Disable transaction for concurrent index creation
-- This prevents table locks during index build

-- flyway:executeInTransaction=false

CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);
```

### Environment-Specific Configuration

Use Spring profiles to adjust Flyway behavior per environment.

```yaml
# application-production.yml
spring:
  flyway:
    # Disable baseline in production - all migrations should exist
    baseline-on-migrate: false

    # Extra validation for production safety
    validate-on-migrate: true

    # Never allow out-of-order migrations in production
    out-of-order: false
```

---

## Common Pitfalls and How to Avoid Them

**Never modify applied migrations.** Once a migration runs in any environment, treat it as immutable. If you need to change something, create a new migration.

**Avoid long-running transactions.** Large data updates should be batched to prevent locking tables for minutes.

**Test against production-like data volumes.** A migration that takes milliseconds on test data might take hours on millions of rows.

**Use explicit column names in INSERT statements.** If you add a column later, migrations with `INSERT INTO table VALUES (...)` will break.

---

## Summary

Flyway brings predictability to database changes. You write SQL files with version numbers, and Flyway handles the rest - tracking what has been applied, running pending migrations, and validating consistency.

Start with simple versioned migrations, add repeatable migrations for views and functions, and use Java migrations only when SQL is not enough. Test your migrations with Testcontainers, and treat applied migrations as immutable.

The investment in proper migration tooling pays off every time you deploy without worrying about database state.

---

*Looking for a monitoring solution that integrates with your Spring Boot applications? [OneUptime](https://oneuptime.com) provides comprehensive observability with OpenTelemetry support, allowing you to track deployments, monitor performance, and debug issues across your entire stack.*

**Related Reading:**
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [When Performance Matters, Skip the ORM](https://oneuptime.com/blog/post/2025-11-13-when-performance-matters-skip-the-orm/view)
