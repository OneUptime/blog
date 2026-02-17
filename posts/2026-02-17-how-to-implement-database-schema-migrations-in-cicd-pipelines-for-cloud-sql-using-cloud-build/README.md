# How to Implement Database Schema Migrations in CI/CD Pipelines for Cloud SQL Using Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Cloud Build, CI/CD, Database Migrations, DevOps

Description: Learn how to automate database schema migrations in your CI/CD pipelines for Cloud SQL instances using Google Cloud Build with practical examples and best practices.

---

Database schema migrations are one of those things that every team eventually needs to automate but few get right on the first try. If you are running Cloud SQL on GCP and using Cloud Build for your CI/CD pipelines, you have a solid foundation to build reliable, repeatable migration workflows. In this post, I will walk through how to set this up from scratch, covering the tricky parts that documentation often glosses over.

## Why Automate Schema Migrations?

Running migrations manually is fine when your team is small and you deploy once a week. But as soon as you start deploying multiple times a day or have multiple environments, manual migrations become a bottleneck and a risk. Someone forgets to run the migration, or runs it out of order, and suddenly your application is throwing errors in production.

Automating migrations inside your CI/CD pipeline ensures that every deployment includes the necessary schema changes, applied in the correct order, every single time.

## Prerequisites

Before diving in, make sure you have the following in place:

- A Cloud SQL instance (PostgreSQL or MySQL)
- Cloud Build API enabled in your GCP project
- A migration tool of your choice (I will use Flyway in these examples, but Liquibase or golang-migrate work just as well)
- Your migration scripts stored in version control alongside your application code

## Setting Up Cloud SQL Proxy in Cloud Build

Cloud Build steps run in containers, so they do not have direct access to your Cloud SQL instance through a private IP. The Cloud SQL Auth Proxy solves this by creating a secure tunnel.

Here is a Cloud Build configuration that starts the proxy as a background step:

```yaml
# cloudbuild.yaml - Main build configuration with Cloud SQL Proxy
steps:
  # Step 1: Start Cloud SQL Auth Proxy in the background
  - name: 'gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0'
    args:
      - '--port=5432'
      - '${_CLOUD_SQL_CONNECTION_NAME}'
    waitFor: ['-']  # Start immediately, don't wait for other steps
    id: 'proxy'
    env:
      - 'INSTANCE_CONNECTION_NAME=${_CLOUD_SQL_CONNECTION_NAME}'

  # Step 2: Wait for the proxy to be ready
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Simple loop to wait for the proxy socket to be available
        for i in $(seq 1 30); do
          nc -z localhost 5432 && exit 0
          sleep 1
        done
        echo "Proxy did not start in time"
        exit 1
    waitFor: ['proxy']
    id: 'wait-for-proxy'
```

The key detail here is `waitFor: ['-']` on the proxy step, which tells Cloud Build to start it immediately without waiting for any preceding steps. This lets it run in the background while subsequent steps execute.

## Running Flyway Migrations

With the proxy running, you can now connect to your Cloud SQL instance from any subsequent build step. Here is how to run Flyway migrations:

```yaml
  # Step 3: Run database migrations using Flyway
  - name: 'flyway/flyway:10'
    args:
      - '-url=jdbc:postgresql://localhost:5432/${_DB_NAME}'
      - '-user=${_DB_USER}'
      - '-password=${_DB_PASSWORD}'
      - '-locations=filesystem:./db/migrations'
      - '-baselineOnMigrate=true'
      - 'migrate'
    waitFor: ['wait-for-proxy']
    id: 'run-migrations'

  # Step 4: Build and deploy the application (only after migrations succeed)
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/${PROJECT_ID}/myapp:${SHORT_SHA}', '.']
    waitFor: ['run-migrations']
    id: 'build-app'

substitutions:
  _CLOUD_SQL_CONNECTION_NAME: 'my-project:us-central1:my-instance'
  _DB_NAME: 'mydb'
  _DB_USER: 'migration_user'
  _DB_PASSWORD: ''  # Use Secret Manager instead
```

## Securing Database Credentials

Hardcoding passwords in your cloudbuild.yaml is a bad idea. Use Secret Manager to store and retrieve credentials securely.

First, create the secret:

```bash
# Create a secret in Secret Manager for the database password
gcloud secrets create db-migration-password \
  --replication-policy="automatic"

# Add the actual password as a secret version
echo -n "your-secure-password" | \
  gcloud secrets versions add db-migration-password --data-file=-
```

Then reference it in your build configuration:

```yaml
# cloudbuild.yaml - Using Secret Manager for credentials
availableSecrets:
  secretManager:
    - versionName: projects/${PROJECT_ID}/secrets/db-migration-password/versions/latest
      env: 'DB_PASSWORD'

steps:
  - name: 'flyway/flyway:10'
    args:
      - '-url=jdbc:postgresql://localhost:5432/${_DB_NAME}'
      - '-user=${_DB_USER}'
      - '-password=$$DB_PASSWORD'  # Double dollar sign to reference the secret
      - '-locations=filesystem:./db/migrations'
      - 'migrate'
    secretEnv: ['DB_PASSWORD']
    waitFor: ['wait-for-proxy']
```

The double dollar sign (`$$DB_PASSWORD`) is important - a single dollar sign would try to do Cloud Build substitution, while the double dollar sign references the secret environment variable.

## Writing Migration Scripts

Keep your migration scripts in a directory like `db/migrations/` with a naming convention that Flyway can pick up:

```sql
-- V001__create_users_table.sql
-- Creates the initial users table with basic fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
```

```sql
-- V002__add_user_roles.sql
-- Adds role-based access control columns to the users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'viewer';

-- Create a check constraint to ensure only valid roles are assigned
ALTER TABLE users ADD CONSTRAINT chk_user_role
    CHECK (role IN ('viewer', 'editor', 'admin', 'owner'));
```

## Handling Migration Failures

What happens when a migration fails midway through? This is where things get interesting. PostgreSQL wraps DDL statements in transactions by default, so a failed migration will roll back cleanly. MySQL does not do this for most DDL statements, so you need to be more careful.

Here is a Cloud Build step that validates migrations before applying them:

```yaml
  # Validate migrations before applying them
  - name: 'flyway/flyway:10'
    args:
      - '-url=jdbc:postgresql://localhost:5432/${_DB_NAME}'
      - '-user=${_DB_USER}'
      - '-password=$$DB_PASSWORD'
      - '-locations=filesystem:./db/migrations'
      - 'validate'
    secretEnv: ['DB_PASSWORD']
    waitFor: ['wait-for-proxy']
    id: 'validate-migrations'

  # Only run migrate if validation passes
  - name: 'flyway/flyway:10'
    args:
      - '-url=jdbc:postgresql://localhost:5432/${_DB_NAME}'
      - '-user=${_DB_USER}'
      - '-password=$$DB_PASSWORD'
      - '-locations=filesystem:./db/migrations'
      - 'migrate'
    secretEnv: ['DB_PASSWORD']
    waitFor: ['validate-migrations']
    id: 'run-migrations'
```

## Separating Migration Permissions

Your migration user should not be the same account your application uses at runtime. Create a dedicated migration user with elevated permissions:

```sql
-- Create a dedicated migration user with schema modification privileges
CREATE USER migration_user WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE mydb TO migration_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_user;

-- Create a restricted application user
CREATE USER app_user WITH PASSWORD 'different-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

This way, even if your application credentials are compromised, an attacker cannot modify the schema.

## Triggering Migrations on Pull Requests

You might want to run migrations against a staging database whenever a pull request is opened. Cloud Build triggers make this straightforward:

```yaml
# cloudbuild-pr.yaml - Triggered on pull requests against staging
steps:
  # Run migrations against the staging database
  - name: 'flyway/flyway:10'
    args:
      - '-url=jdbc:postgresql://localhost:5432/staging_db'
      - '-user=${_DB_USER}'
      - '-password=$$DB_PASSWORD'
      - '-locations=filesystem:./db/migrations'
      - '-baselineOnMigrate=true'
      - 'info'  # Just show migration status, don't apply
    secretEnv: ['DB_PASSWORD']
    waitFor: ['wait-for-proxy']
```

Using `info` instead of `migrate` lets you preview what changes would be applied without actually running them - useful for code review.

## Pipeline Flow Overview

Here is how the complete pipeline fits together:

```mermaid
flowchart TD
    A[Code Push / PR Merge] --> B[Cloud Build Triggered]
    B --> C[Start Cloud SQL Proxy]
    C --> D[Wait for Proxy Ready]
    D --> E[Validate Migrations]
    E --> F{Validation Passed?}
    F -->|Yes| G[Run Migrations]
    F -->|No| H[Fail Build]
    G --> I{Migration Succeeded?}
    I -->|Yes| J[Build Application]
    I -->|No| H
    J --> K[Deploy to GKE / Cloud Run]
    K --> L[Run Smoke Tests]
```

## Tips from Production Experience

After running this setup in production for a while, here are some lessons learned:

1. Always make migrations backward compatible. Your old application version will still be running during deployment, so dropping a column that the old code references will cause errors.

2. Use a migration lock table. Flyway does this by default, but if you are using a custom migration runner, make sure two builds cannot run migrations simultaneously.

3. Set a reasonable timeout on the proxy wait step. Thirty seconds is usually plenty, but network issues can cause delays.

4. Keep each migration script focused on one change. It is tempting to bundle multiple alterations into one file, but smaller migrations are easier to debug when something goes wrong.

5. Test migrations against a copy of production data before deploying. Cloud SQL point-in-time recovery makes it easy to create a clone for testing.

Automating schema migrations removes one of the scariest parts of deployment. Once you have this pipeline running, you can focus on writing good migration scripts instead of worrying about whether they will actually get applied.
