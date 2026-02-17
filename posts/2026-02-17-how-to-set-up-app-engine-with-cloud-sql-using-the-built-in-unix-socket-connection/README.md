# How to Set Up App Engine with Cloud SQL Using the Built-In Unix Socket Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Cloud SQL, Database, Unix Socket

Description: Learn how to connect your App Engine application to Cloud SQL using the built-in Unix socket proxy for secure, low-latency database access without extra configuration.

---

App Engine has built-in support for connecting to Cloud SQL instances through a Unix socket. This is the recommended way to connect because it does not require setting up the Cloud SQL Auth Proxy yourself, does not need IP allowlisting, and the connection is encrypted automatically. The Unix socket is managed by Google's infrastructure, so there is nothing to install or maintain.

In this guide, I will show you how to set up the connection for both MySQL and PostgreSQL, configure your application code, and handle connection pooling properly.

## How the Unix Socket Connection Works

When you deploy to App Engine, Google's infrastructure automatically creates a Unix socket for each Cloud SQL instance you reference in your `app.yaml`. The socket path follows this pattern:

```
/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

Your application connects to this socket as if it were a local database. Under the hood, Google's Cloud SQL proxy handles authentication, encryption, and routing to the actual Cloud SQL instance. You do not need to manage any of this.

## Step 1: Create a Cloud SQL Instance

If you do not already have a Cloud SQL instance:

```bash
# Create a PostgreSQL instance
gcloud sql instances create my-db-instance \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --project=your-project-id

# Create a database
gcloud sql databases create myapp \
  --instance=my-db-instance \
  --project=your-project-id

# Set the postgres user password
gcloud sql users set-password postgres \
  --instance=my-db-instance \
  --password=your-secure-password \
  --project=your-project-id
```

For MySQL:

```bash
# Create a MySQL instance
gcloud sql instances create my-mysql-instance \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --project=your-project-id
```

## Step 2: Configure app.yaml

Add the Cloud SQL instance connection name to your `app.yaml`:

```yaml
# app.yaml - Connect to Cloud SQL via Unix socket
runtime: python312

env_variables:
  DB_USER: "postgres"
  DB_NAME: "myapp"
  DB_PASS_SECRET: "db-password"  # Secret Manager reference for the password
  CLOUD_SQL_CONNECTION_NAME: "your-project-id:us-central1:my-db-instance"

# Grant App Engine permission to connect to Cloud SQL
beta_settings:
  cloud_sql_instances: "your-project-id:us-central1:my-db-instance"
```

The `beta_settings.cloud_sql_instances` line is the key. It tells App Engine to set up the Unix socket for this instance. You can list multiple instances separated by commas if your app connects to more than one database.

## Step 3: Connect from Python with SQLAlchemy

Install the required dependencies:

```
# requirements.txt
SQLAlchemy==2.0.25
pg8000==1.31.0        # Pure Python PostgreSQL driver (works with Unix sockets)
cloud-sql-python-connector==1.6.0  # Optional but recommended
google-cloud-secret-manager==2.18.0
```

Here is how to create a connection using the Unix socket directly:

```python
# database.py - Connect to Cloud SQL via Unix socket
import os
import sqlalchemy

def get_database_engine():
    """Create a SQLAlchemy engine connected to Cloud SQL via Unix socket."""
    db_user = os.environ.get("DB_USER", "postgres")
    db_pass = os.environ.get("DB_PASS", "")
    db_name = os.environ.get("DB_NAME", "myapp")
    connection_name = os.environ.get("CLOUD_SQL_CONNECTION_NAME")

    # Build the Unix socket path
    unix_socket_path = f"/cloudsql/{connection_name}"

    # PostgreSQL connection string using Unix socket
    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL.create(
            drivername="postgresql+pg8000",
            username=db_user,
            password=db_pass,
            database=db_name,
            query={"unix_sock": f"{unix_socket_path}/.s.PGSQL.5432"}
        ),
        # Connection pool configuration
        pool_size=5,          # Number of persistent connections
        max_overflow=2,       # Extra connections beyond pool_size
        pool_timeout=30,      # Seconds to wait for a connection from the pool
        pool_recycle=1800,    # Recycle connections after 30 minutes
        pool_pre_ping=True,   # Check connection health before using
    )

    return pool
```

For MySQL, the connection string is slightly different:

```python
# database.py - MySQL connection via Unix socket
import sqlalchemy

def get_mysql_engine():
    """Create a SQLAlchemy engine for MySQL via Unix socket."""
    db_user = os.environ.get("DB_USER", "root")
    db_pass = os.environ.get("DB_PASS", "")
    db_name = os.environ.get("DB_NAME", "myapp")
    connection_name = os.environ.get("CLOUD_SQL_CONNECTION_NAME")

    unix_socket_path = f"/cloudsql/{connection_name}"

    # MySQL connection using the Unix socket
    pool = sqlalchemy.create_engine(
        sqlalchemy.engine.url.URL.create(
            drivername="mysql+pymysql",
            username=db_user,
            password=db_pass,
            database=db_name,
            query={"unix_socket": unix_socket_path}
        ),
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
    )

    return pool
```

## Step 4: Using the Cloud SQL Python Connector

The Cloud SQL Python Connector is a newer library that provides additional features like IAM authentication:

```python
# database.py - Using Cloud SQL Python Connector
from google.cloud.sql.connector import Connector
import sqlalchemy
import os

# Create a global connector instance
connector = Connector()

def get_connection():
    """Get a database connection using the Cloud SQL Connector."""
    connection = connector.connect(
        os.environ.get("CLOUD_SQL_CONNECTION_NAME"),
        "pg8000",
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASS"),
        db=os.environ.get("DB_NAME"),
    )
    return connection

def get_engine():
    """Create a SQLAlchemy engine using the Cloud SQL Connector."""
    engine = sqlalchemy.create_engine(
        "postgresql+pg8000://",
        creator=get_connection,
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
    )
    return engine
```

The connector handles the Unix socket connection internally and adds support for IAM database authentication, which eliminates the need for passwords entirely.

## Step 5: Connect from Node.js

For Node.js applications using Knex.js or a similar query builder:

```javascript
// database.js - Connect to Cloud SQL from Node.js
const Knex = require("knex");

function createPool() {
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

  // PostgreSQL connection via Unix socket
  const config = {
    client: "pg",
    connection: {
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "myapp",
      // Unix socket host path for PostgreSQL
      host: `/cloudsql/${connectionName}`,
    },
    pool: {
      min: 2,      // Minimum connections in the pool
      max: 10,     // Maximum connections in the pool
      acquireTimeoutMillis: 30000,  // Timeout to acquire a connection
      idleTimeoutMillis: 600000,    // Close idle connections after 10 minutes
    },
  };

  return Knex(config);
}

// Create and export the pool
const db = createPool();
module.exports = db;
```

For MySQL with Node.js:

```javascript
// database.js - MySQL connection via Unix socket
const Knex = require("knex");

const db = Knex({
  client: "mysql2",
  connection: {
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "myapp",
    // MySQL uses socketPath instead of host
    socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
  },
  pool: { min: 2, max: 10 },
});
```

## Connection Pooling Best Practices

Connection pooling is critical on App Engine because instances scale up and down. Each instance maintains its own connection pool, so the total number of database connections is:

```
Total connections = number_of_instances * pool_size_per_instance
```

If you have 10 instances with a pool size of 10, that is 100 database connections. Cloud SQL has connection limits based on instance size:

```
db-f1-micro: 25 connections
db-g1-small: 50 connections
db-n1-standard-1: 100 connections
db-n1-standard-2: 200 connections
```

Size your pools accordingly:

```python
# Conservative pool sizing for automatic scaling
engine = sqlalchemy.create_engine(
    connection_url,
    pool_size=3,       # Keep it small per instance
    max_overflow=1,    # Allow 1 extra connection under load
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
```

## Connecting to Multiple Cloud SQL Instances

If your app needs multiple databases:

```yaml
# app.yaml - Multiple Cloud SQL instances
beta_settings:
  cloud_sql_instances: >-
    project:region:main-db,
    project:region:analytics-db,
    project:region:auth-db

env_variables:
  MAIN_DB_CONNECTION: "project:region:main-db"
  ANALYTICS_DB_CONNECTION: "project:region:analytics-db"
  AUTH_DB_CONNECTION: "project:region:auth-db"
```

Each instance gets its own Unix socket, and you create separate engine/pool instances for each.

## Local Development

For local development, use the Cloud SQL Auth Proxy:

```bash
# Download and run the Cloud SQL Auth Proxy
cloud-sql-proxy your-project-id:us-central1:my-db-instance \
  --port=5432

# Or use Docker
docker run -p 5432:5432 \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest \
  your-project-id:us-central1:my-db-instance
```

Then connect using TCP instead of Unix socket:

```python
# Local development connection (TCP instead of Unix socket)
if os.environ.get("APP_ENV") == "development":
    engine = sqlalchemy.create_engine(
        f"postgresql+pg8000://{db_user}:{db_pass}@localhost:5432/{db_name}"
    )
else:
    # Production: use Unix socket (code from above)
    engine = get_database_engine()
```

## Troubleshooting Connection Issues

If you get connection errors after deploying, check these items:

1. Verify the instance connection name is correct in `beta_settings`
2. Make sure the App Engine service account has the `Cloud SQL Client` role
3. Check that the Cloud SQL instance is in the same region as your App Engine app
4. Verify the database name and user credentials are correct

```bash
# Grant Cloud SQL Client role to App Engine service account
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:your-project-id@appspot.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## Summary

The built-in Unix socket connection between App Engine and Cloud SQL is the simplest and most secure way to connect your application to a database. Add the instance to `beta_settings` in `app.yaml`, construct the connection string using the socket path, configure connection pooling to stay within Cloud SQL limits, and you are set. The connection is encrypted and authenticated automatically, and there is no proxy process to manage. For local development, use the Cloud SQL Auth Proxy to get a similar experience.
