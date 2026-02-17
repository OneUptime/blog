# How to Implement Serverless Database Migrations Using Cloud Run Jobs and Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run Jobs, Cloud SQL, Database Migrations, Serverless, DevOps

Description: Run database migrations as serverless Cloud Run Jobs on Google Cloud, connecting securely to Cloud SQL without managing migration servers or jump boxes.

---

Database migrations are a necessary evil in application development. Every time you change your schema - adding a column, creating an index, modifying a constraint - you need to run a migration. Traditionally, this means SSHing into a server or running a migration from your CI/CD pipeline through a bastion host. Cloud Run Jobs offer a cleaner approach: package your migration as a container, run it as a one-off job, and throw away the compute when it finishes. No servers to maintain, no SSH keys to manage, no bastion hosts to keep patched.

In this post, I will show you how to set up database migrations using Cloud Run Jobs with Cloud SQL, including secure connectivity, rollback strategies, and CI/CD integration.

## Why Cloud Run Jobs for Migrations

Cloud Run Jobs differ from Cloud Run services in one key way: they run to completion and then stop. There is no HTTP endpoint. This is exactly what migrations need - execute the migration script, verify it succeeded, and exit. You pay only for the time the migration runs, and you get the same connectivity to Cloud SQL through the Cloud SQL Auth Proxy that Cloud Run services use.

## Setting Up the Migration Framework

I will use Node.js with Knex.js for migrations, but the same pattern works with any language and migration tool (Flyway, Alembic, Prisma, etc.).

```bash
mkdir db-migrations && cd db-migrations
npm init -y
npm install knex pg
```

Create the Knex configuration file.

```javascript
// knexfile.js
module.exports = {
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '/cloudsql/' + process.env.INSTANCE_CONNECTION_NAME,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};
```

## Writing Migration Files

Each migration has an up function (apply the change) and a down function (reverse the change).

```javascript
// migrations/20260217_001_create_users_table.js
exports.up = async function(knex) {
  // Create the users table with essential columns
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['admin', 'editor', 'viewer']).defaultTo('viewer');
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add an index for email lookups during authentication
  await knex.schema.raw(
    'CREATE INDEX idx_users_email_verified ON users (email) WHERE email_verified = true'
  );
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
};
```

```javascript
// migrations/20260217_002_create_orders_table.js
exports.up = async function(knex) {
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.decimal('total_amount', 10, 2).notNullable();
    table.enum('status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .defaultTo('pending');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Index for querying orders by user
  await knex.schema.raw('CREATE INDEX idx_orders_user_id ON orders (user_id)');
  // Index for filtering by status
  await knex.schema.raw('CREATE INDEX idx_orders_status ON orders (status)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('orders');
};
```

## The Migration Runner

Create an entry point that runs the migration and reports the result.

```javascript
// run-migration.js - Entry point for the Cloud Run Job
const knex = require('knex');
const config = require('./knexfile');

async function runMigrations() {
  const db = knex(config.production);
  const action = process.env.MIGRATION_ACTION || 'latest';

  console.log(`Starting database migration (action: ${action})...`);
  console.log(`Database: ${process.env.DB_NAME}`);

  try {
    let result;

    switch (action) {
      case 'latest':
        // Apply all pending migrations
        result = await db.migrate.latest();
        console.log(`Applied ${result[1].length} migration(s):`);
        result[1].forEach(file => console.log(`  - ${file}`));
        break;

      case 'rollback':
        // Roll back the last batch of migrations
        result = await db.migrate.rollback();
        console.log(`Rolled back ${result[1].length} migration(s):`);
        result[1].forEach(file => console.log(`  - ${file}`));
        break;

      case 'status':
        // Show migration status without making changes
        const [completed, pending] = await Promise.all([
          db.migrate.list(),
          db.migrate.list(),
        ]);
        const currentVersion = await db.migrate.currentVersion();
        console.log(`Current version: ${currentVersion}`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Verify the migration by checking the current version
    const version = await db.migrate.currentVersion();
    console.log(`Migration complete. Current version: ${version}`);

    await db.destroy();
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error.stack);
    await db.destroy();
    process.exit(1);
  }
}

runMigrations();
```

## The Dockerfile

```dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

# Install the Cloud SQL Auth Proxy client library dependencies
COPY package*.json ./
RUN npm ci --production

# Copy migration files and configuration
COPY knexfile.js .
COPY run-migration.js .
COPY migrations/ ./migrations/

# The migration runner is the entry point
CMD ["node", "run-migration.js"]
```

## Deploying and Running the Migration Job

```bash
# Build the container image
gcloud builds submit --tag gcr.io/my-project/db-migrations:latest .

# Create the Cloud Run Job with Cloud SQL connection
gcloud run jobs create run-migrations \
  --image=gcr.io/my-project/db-migrations:latest \
  --region=us-central1 \
  --set-cloudsql-instances=my-project:us-central1:my-database \
  --set-env-vars="DB_NAME=myapp,DB_USER=migration_user,INSTANCE_CONNECTION_NAME=my-project:us-central1:my-database,MIGRATION_ACTION=latest" \
  --set-secrets="DB_PASS=db-migration-password:latest" \
  --task-timeout=300 \
  --max-retries=0

# Execute the migration job
gcloud run jobs execute run-migrations --region=us-central1

# Check the execution status
gcloud run jobs executions list --job=run-migrations --region=us-central1

# View the migration logs
gcloud run jobs executions describe EXECUTION_ID \
  --job=run-migrations \
  --region=us-central1
```

## Rolling Back Migrations

To roll back, execute the job with the rollback action.

```bash
# Execute rollback
gcloud run jobs execute run-migrations \
  --region=us-central1 \
  --update-env-vars="MIGRATION_ACTION=rollback"
```

## Integrating with CI/CD

Add the migration step to your Cloud Build pipeline so migrations run automatically on deploy.

```yaml
# cloudbuild.yaml
steps:
  # Step 1: Build the migration container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/db-migrations:$COMMIT_SHA', '-f', 'Dockerfile.migrations', '.']

  # Step 2: Push the migration image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/db-migrations:$COMMIT_SHA']

  # Step 3: Run the migration using Cloud Run Jobs
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud run jobs update run-migrations \
          --image=gcr.io/$PROJECT_ID/db-migrations:$COMMIT_SHA \
          --region=us-central1

        gcloud run jobs execute run-migrations \
          --region=us-central1 \
          --wait

  # Step 4: Deploy the application (only if migration succeeded)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'run'
      - 'deploy'
      - 'my-app'
      - '--image=gcr.io/$PROJECT_ID/my-app:$COMMIT_SHA'
      - '--region=us-central1'
```

## Security Best Practices

Create a dedicated database user for migrations with limited privileges.

```sql
-- Create a migration user with schema modification privileges
CREATE USER migration_user WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE myapp TO migration_user;
GRANT USAGE ON SCHEMA public TO migration_user;
GRANT CREATE ON SCHEMA public TO migration_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO migration_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO migration_user;

-- The application user should have fewer privileges
CREATE USER app_user WITH PASSWORD 'different-password';
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

Store credentials in Secret Manager, not in environment variables.

```bash
# Store the migration password in Secret Manager
echo -n 'secure-password' | gcloud secrets create db-migration-password --data-file=-

# Grant the Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding db-migration-password \
  --member="serviceAccount:$(gcloud projects describe my-project --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Wrapping Up

Cloud Run Jobs are an elegant solution for database migrations. You get a clean, reproducible execution environment without maintaining migration servers. The Cloud SQL Auth Proxy integration handles secure connectivity. And the job execution history gives you an audit trail of every migration that has run.

Monitor your migration jobs and database health with OneUptime. Set up alerts for failed migration executions and track database performance metrics before and after migrations. A migration that accidentally creates a missing index or adds a lock-heavy column change can impact your application - monitoring helps you catch these issues quickly.
