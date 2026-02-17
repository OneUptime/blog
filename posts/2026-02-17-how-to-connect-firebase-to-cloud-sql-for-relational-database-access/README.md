# How to Connect Firebase to Cloud SQL for Relational Database Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firebase, Cloud SQL, Relational Database, Google Cloud

Description: Learn how to connect Firebase Cloud Functions and Cloud Run services to Cloud SQL for PostgreSQL or MySQL when your application needs relational database capabilities.

---

Firestore is great for many use cases, but sometimes you need a relational database. Complex joins, strict schemas, ACID transactions across multiple tables, or compatibility with existing SQL-based tools - these are all reasons to reach for Cloud SQL. Connecting Firebase services (Cloud Functions, hosting backends) to Cloud SQL is straightforward once you understand the connection patterns, but there are a few gotchas around connection pooling and authentication that trip people up.

This guide covers setting up Cloud SQL, connecting from Firebase Cloud Functions v2 and Cloud Run, handling connection pooling properly, and avoiding the common mistakes.

## When to Use Cloud SQL Instead of Firestore

Choose Cloud SQL when you need:

- Complex queries with JOINs across multiple tables
- Strong schema enforcement
- Compatibility with SQL tools (Metabase, Grafana, etc.)
- Full ACID transactions spanning multiple tables
- Migration from an existing SQL database
- Aggregation queries that would be expensive in Firestore

Stick with Firestore when you need:

- Real-time listeners for live updates
- Offline data sync
- Document-oriented data that does not need relational queries
- Simple key-value or hierarchical data

## Step 1: Create a Cloud SQL Instance

```bash
# Create a PostgreSQL instance
gcloud sql instances create my-firebase-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=20GB \
  --availability-type=zonal \
  --root-password=YOUR_STRONG_PASSWORD

# Create a database
gcloud sql databases create myapp --instance=my-firebase-db

# Create a user for your application
gcloud sql users create app_user \
  --instance=my-firebase-db \
  --password=APP_USER_PASSWORD
```

For MySQL instead:

```bash
# Create a MySQL instance
gcloud sql instances create my-firebase-db \
  --database-version=MYSQL_8_0 \
  --tier=db-custom-2-8192 \
  --region=us-central1 \
  --root-password=YOUR_STRONG_PASSWORD
```

## Step 2: Get the Connection Name

You need the instance connection name for the Cloud SQL proxy:

```bash
# Get the connection name
gcloud sql instances describe my-firebase-db \
  --format="value(connectionName)"
```

This returns something like `my-project:us-central1:my-firebase-db`. Save this - you will need it in your function configuration.

## Step 3: Connect from Firebase Cloud Functions v2

v2 functions run on Cloud Run, which can connect to Cloud SQL through the built-in Cloud SQL proxy.

### Install Dependencies

```bash
# For PostgreSQL
npm install pg
npm install @types/pg --save-dev  # if using TypeScript

# For MySQL
npm install mysql2
```

### PostgreSQL Connection

```typescript
// functions/src/index.ts - Connecting to Cloud SQL from v2 functions
import { onRequest } from "firebase-functions/v2/https";
import { Pool } from "pg";

// Connection pool - created once per instance, reused across requests
let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      // When running on Cloud Run, use Unix socket
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 5,  // Maximum connections per function instance
    });
  }
  return pool;
}

// API endpoint that queries Cloud SQL
export const getUsers = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    concurrency: 80,
    // This is the key setting - it tells Cloud Run to mount the SQL proxy
    secrets: ["DB_PASSWORD"],
  },
  async (req, res) => {
    try {
      const db = getPool();
      const result = await db.query(
        "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 50"
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Database query failed:", error);
      res.status(500).json({ error: "Database error" });
    }
  }
);

// Create a new user
export const createUser = onRequest(
  {
    region: "us-central1",
    memory: "512MiB",
    concurrency: 80,
    secrets: ["DB_PASSWORD"],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    try {
      const db = getPool();
      const result = await db.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
        [name, email]
      );
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error.code === "23505") {
        // Unique violation
        return res.status(409).json({ error: "Email already exists" });
      }
      console.error("Database insert failed:", error);
      res.status(500).json({ error: "Database error" });
    }
  }
);
```

### Environment Variables and Secrets

Store database credentials securely using Secret Manager:

```bash
# Create secrets in Secret Manager
echo -n "app_user" | gcloud secrets create DB_USER --data-file=-
echo -n "APP_USER_PASSWORD" | gcloud secrets create DB_PASSWORD --data-file=-
echo -n "myapp" | gcloud secrets create DB_NAME --data-file=-
echo -n "my-project:us-central1:my-firebase-db" | \
  gcloud secrets create CLOUD_SQL_CONNECTION_NAME --data-file=-
```

Reference secrets in your function configuration:

```typescript
// Using secrets in v2 function configuration
import { defineSecret } from "firebase-functions/params";

const dbPassword = defineSecret("DB_PASSWORD");
const dbUser = defineSecret("DB_USER");

export const api = onRequest(
  {
    region: "us-central1",
    secrets: [dbPassword, dbUser],
  },
  async (req, res) => {
    // Secrets are available as environment variables
    const password = dbPassword.value();
    const user = dbUser.value();
    // ... use credentials
  }
);
```

## Step 4: Configure Cloud SQL Connection in firebase.json

For v2 functions, you need to specify the Cloud SQL connection:

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "frameworkAware": true
  }
}
```

And in the function definition, add the VPC connector if needed:

```typescript
export const api = onRequest(
  {
    region: "us-central1",
    // Allow the function to connect to Cloud SQL
    vpcConnector: "projects/my-project/locations/us-central1/connectors/my-connector",
    vpcConnectorEgressSettings: "PRIVATE_RANGES_ONLY",
  },
  async (req, res) => {
    // ...
  }
);
```

## Step 5: Connection Pooling Best Practices

Connection pooling is critical when connecting from serverless functions. Without it, each request creates a new database connection, which quickly exhausts the connection limit.

### For Cloud Functions v2 (Cloud Run)

Since v2 functions support concurrency, a single instance handles multiple requests. Set the pool size based on your concurrency setting:

```typescript
// Pool configuration for v2 functions with concurrency=80
const pool = new Pool({
  host: `/cloudsql/${connectionName}`,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  // Set max connections per instance
  // Rule of thumb: concurrency / 10, minimum 5
  max: 10,
  // Close idle connections after 10 minutes
  idleTimeoutMillis: 600000,
  // Timeout for acquiring a connection from the pool
  connectionTimeoutMillis: 5000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});
```

### Cloud SQL Instance Connection Limits

Cloud SQL has connection limits based on instance tier:

| Tier | Max Connections |
|------|----------------|
| db-f1-micro | 25 |
| db-custom-1-3840 | 200 |
| db-custom-2-8192 | 500 |
| db-custom-4-16384 | 1000 |

If you have multiple function instances, each with a pool of 10 connections, and 20 instances, that is 200 connections. Plan your pool sizes accordingly.

### Using the Cloud SQL Auth Proxy

For local development, use the Cloud SQL Auth Proxy:

```bash
# Download and run the proxy
cloud-sql-proxy my-project:us-central1:my-firebase-db \
  --port=5432

# Now connect to localhost:5432 from your local code
```

Update your connection code to handle both local and production:

```typescript
// Connection configuration that works locally and on Cloud Run
function createPool(): Pool {
  // Check if running on Cloud Run (has Cloud SQL socket)
  const isProduction = process.env.K_SERVICE !== undefined;

  if (isProduction) {
    return new Pool({
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 10,
    });
  } else {
    // Local development - connect through the proxy
    return new Pool({
      host: "127.0.0.1",
      port: 5432,
      user: process.env.DB_USER || "app_user",
      password: process.env.DB_PASSWORD || "local_password",
      database: process.env.DB_NAME || "myapp",
      max: 5,
    });
  }
}
```

## Step 6: Database Schema and Migrations

Set up your database schema. You can use raw SQL or a migration tool:

```sql
-- migrations/001_create_users.sql
-- Create the users table with basic fields
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(128) UNIQUE,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for Firebase UID lookups
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

-- Create the orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user order lookups
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

Apply migrations:

```bash
# Connect to Cloud SQL and run migrations
gcloud sql connect my-firebase-db --user=app_user --database=myapp < migrations/001_create_users.sql
```

For production, use a proper migration tool like Knex.js or Prisma:

```typescript
// Using Knex.js for migrations
// knexfile.ts
import type { Knex } from "knex";

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: process.env.K_SERVICE
      ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`
      : "127.0.0.1",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  migrations: {
    directory: "./migrations",
  },
};

export default config;
```

## Step 7: Integrating with Firebase Auth

Map Firebase users to Cloud SQL records:

```typescript
// Create or update a user record when they sign up via Firebase
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Pool } from "pg";

export const syncUserToSQL = onRequest(
  {
    region: "us-central1",
    secrets: ["DB_PASSWORD"],
  },
  async (req, res) => {
    // After verifying Firebase token (see auth middleware)
    const firebaseUid = req.user.uid;
    const email = req.user.email;
    const name = req.user.name || "Unknown";

    const db = getPool();

    // Upsert the user record
    const result = await db.query(
      `INSERT INTO users (firebase_uid, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET email = $2, name = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING id, firebase_uid, email, name, role`,
      [firebaseUid, email, name]
    );

    res.json(result.rows[0]);
  }
);
```

## Common Mistakes and Solutions

### 1. Too Many Connections

If you see "too many connections" errors, your pool settings are too aggressive:

```typescript
// Solution: reduce pool size and add connection cleanup
const pool = new Pool({
  max: 3,  // Start small
  idleTimeoutMillis: 30000,  // Close idle connections quickly
  connectionTimeoutMillis: 10000,
});
```

### 2. Cold Start Connection Delays

The first request to a cold function instance needs to establish database connections:

```typescript
// Solution: warm up the connection pool during instance initialization
const pool = getPool();

// Pre-warm one connection
pool.query("SELECT 1").catch(console.error);
```

### 3. Unix Socket Not Found

If you get "could not connect to server: No such file or directory":

```bash
# Make sure the Cloud SQL connection is configured
# For Cloud Functions v2, it should be automatic when you reference
# the /cloudsql/ socket path

# Verify the connection name
gcloud sql instances describe my-firebase-db \
  --format="value(connectionName)"
```

### 4. IAM Permissions

The service account running your function needs the `cloudsql.client` role:

```bash
# Grant Cloud SQL client access to the function's service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## Performance Tips

1. **Use connection pooling** - Always. Never create a new connection per request.

2. **Index your queries** - Cloud SQL performance depends heavily on proper indexing. Use EXPLAIN ANALYZE to check query plans.

3. **Use prepared statements** - They reduce query parsing overhead and prevent SQL injection:

```typescript
// Parameterized queries are automatically prepared
const result = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);
```

4. **Keep functions and Cloud SQL in the same region** - Cross-region database calls add significant latency.

5. **Monitor connection usage** - Check Cloud SQL metrics in Cloud Monitoring to ensure you are not hitting connection limits.

## Wrapping Up

Connecting Firebase to Cloud SQL gives you the best of both ecosystems: Firebase's excellent developer experience for authentication, hosting, and real-time features, combined with the power of a relational database for complex queries and strict data integrity. The key is getting connection pooling right and keeping your function instances and database in the same region. Start with a small Cloud SQL instance, monitor your connection usage, and scale up as needed.
