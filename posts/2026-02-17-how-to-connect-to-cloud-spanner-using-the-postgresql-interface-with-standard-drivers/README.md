# How to Connect to Cloud Spanner Using the PostgreSQL Interface with Standard Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, PostgreSQL, Database Drivers, PGAdapter

Description: Learn how to connect to Cloud Spanner using its PostgreSQL-compatible interface with standard PostgreSQL drivers and tools through PGAdapter for familiar development workflows.

---

Cloud Spanner is a powerful globally distributed database, but its proprietary client libraries have always been a barrier for teams coming from the PostgreSQL world. You had to learn new APIs, new query syntax quirks, and new tooling. That changed when Google introduced the PostgreSQL interface for Cloud Spanner, which lets you use standard PostgreSQL drivers and tools to talk to Spanner.

The key component that makes this work is PGAdapter - a lightweight proxy that translates the PostgreSQL wire protocol to Spanner's native protocol. Your application thinks it is talking to a PostgreSQL database, but behind the scenes it is getting all of Spanner's global distribution, strong consistency, and automatic scaling.

## Setting Up a PostgreSQL-Dialect Spanner Database

First, you need to create a Spanner instance and database that uses the PostgreSQL dialect. You can do this through the Console or with gcloud:

```bash
# Create a Spanner instance (if you do not already have one)
gcloud spanner instances create my-pg-instance \
  --config=regional-us-central1 \
  --description="PostgreSQL interface instance" \
  --nodes=1

# Create a database with the PostgreSQL dialect
# The --database-dialect flag is what switches from GoogleSQL to PostgreSQL
gcloud spanner databases create my-pg-database \
  --instance=my-pg-instance \
  --database-dialect=POSTGRESQL
```

Once the database is created, you can define your schema using PostgreSQL-compatible DDL:

```sql
-- Standard PostgreSQL CREATE TABLE syntax works
-- Note: Spanner requires a primary key on every table
CREATE TABLE users (
  user_id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(256) NOT NULL,
  display_name VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  post_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(512) NOT NULL,
  content TEXT,
  published_at TIMESTAMPTZ,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## Running PGAdapter

PGAdapter is the bridge between PostgreSQL drivers and Cloud Spanner. It runs as a local process and listens on a TCP port, just like a PostgreSQL server would.

You can run PGAdapter using Docker, which is the simplest option:

```bash
# Run PGAdapter in Docker, exposing port 5432
# It will use your application default credentials for authentication
docker run -d \
  --name pgadapter \
  -p 5432:5432 \
  gcr.io/cloud-spanner-pg-adapter/pgadapter:latest \
  -p my-gcp-project \
  -i my-pg-instance \
  -d my-pg-database \
  -x 0.0.0.0
```

The flags are straightforward: `-p` for project, `-i` for instance, `-d` for database, and `-x` for the address to listen on. Setting `-x` to `0.0.0.0` allows connections from outside the container.

If you prefer running it directly with Java:

```bash
# Download PGAdapter
wget https://storage.googleapis.com/pgadapter-jar-releases/pgadapter.tar.gz
tar -xzf pgadapter.tar.gz

# Run PGAdapter with a service account key file
java -jar pgadapter.jar \
  -p my-gcp-project \
  -i my-pg-instance \
  -d my-pg-database \
  -c /path/to/service-account-key.json
```

## Connecting with psql

Once PGAdapter is running, you can connect with the standard psql command-line tool:

```bash
# Connect to Spanner through PGAdapter using psql
# No password is needed because PGAdapter handles authentication
psql -h localhost -p 5432 -d my-pg-database
```

From there, you can run queries just like you would against a regular PostgreSQL database:

```sql
-- Insert data using standard PostgreSQL syntax
INSERT INTO users (user_id, email, display_name)
VALUES ('u-001', 'alice@example.com', 'Alice');

-- Query with standard SQL
SELECT user_id, email, created_at FROM users WHERE email LIKE '%@example.com';
```

## Connecting from Application Code

The real power of the PostgreSQL interface is using standard drivers in your application code. Here are examples in several popular languages.

### Python with psycopg2

```python
# Connect to Cloud Spanner using the standard psycopg2 PostgreSQL driver
import psycopg2

# PGAdapter handles auth, so no password is needed
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="my-pg-database",
    user="",        # Leave empty - PGAdapter handles auth
    password=""     # Leave empty
)

cursor = conn.cursor()

# Standard parameterized queries work as expected
cursor.execute(
    "INSERT INTO users (user_id, email, display_name) VALUES (%s, %s, %s)",
    ("u-002", "bob@example.com", "Bob")
)
conn.commit()

# Fetch results just like normal PostgreSQL
cursor.execute("SELECT user_id, email FROM users ORDER BY created_at DESC")
for row in cursor.fetchall():
    print(f"User: {row[0]}, Email: {row[1]}")

cursor.close()
conn.close()
```

### Node.js with pg (node-postgres)

```javascript
// Connect to Cloud Spanner using the standard node-postgres driver
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'my-pg-database',
  // No user/password needed with PGAdapter
});

async function main() {
  const client = await pool.connect();

  try {
    // Insert data with parameterized query
    await client.query(
      'INSERT INTO users (user_id, email, display_name) VALUES ($1, $2, $3)',
      ['u-003', 'charlie@example.com', 'Charlie']
    );

    // Query with standard pg syntax
    const result = await client.query(
      'SELECT user_id, email FROM users WHERE display_name = $1',
      ['Charlie']
    );

    console.log('Found users:', result.rows);
  } finally {
    client.release();
  }
}

main().catch(console.error);
```

### Go with pgx

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/jackc/pgx/v5"
)

func main() {
    ctx := context.Background()

    // Connect using standard pgx PostgreSQL driver
    conn, err := pgx.Connect(ctx, "postgres://localhost:5432/my-pg-database")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close(ctx)

    // Execute a query with parameter binding
    rows, err := conn.Query(ctx,
        "SELECT user_id, email, display_name FROM users WHERE created_at > $1",
        "2026-01-01T00:00:00Z",
    )
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var userID, email, name string
        if err := rows.Scan(&userID, &email, &name); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("User: %s (%s)\n", name, email)
    }
}
```

## Using ORMs with Spanner's PostgreSQL Interface

Many ORMs work with PGAdapter since they use standard PostgreSQL drivers underneath. Here is an example with SQLAlchemy:

```python
# Use SQLAlchemy ORM with Cloud Spanner through PGAdapter
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.orm import declarative_base, Session
from datetime import datetime

# Standard PostgreSQL connection string - PGAdapter makes this work
engine = create_engine('postgresql://localhost:5432/my-pg-database')
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    user_id = Column(String(36), primary_key=True)
    email = Column(String(256), nullable=False)
    display_name = Column(String(128))
    created_at = Column(DateTime)

# Query using the ORM
with Session(engine) as session:
    users = session.query(User).filter(User.email.like('%@example.com')).all()
    for user in users:
        print(f"{user.display_name}: {user.email}")
```

## What Works and What Does Not

The PostgreSQL interface supports a large subset of PostgreSQL syntax, but not everything. Here is what you should know.

Things that work well: basic CRUD operations, parameterized queries, transactions, most standard SQL functions, JOINs, subqueries, CTEs, and batch operations.

Things that are different or unsupported: stored procedures and functions (Spanner does not support PL/pgSQL), LISTEN/NOTIFY, sequences (use UUID generation instead), temporary tables, advisory locks, and some PostgreSQL-specific system views.

Spanner also has some behaviors that differ from PostgreSQL. For example, Spanner does not guarantee read-your-writes in different transactions unless you use strong reads, and its transaction model uses pessimistic concurrency with different isolation semantics.

## Running PGAdapter in Production

For production deployments, run PGAdapter as a sidecar container alongside your application. In Kubernetes, that looks like this:

```yaml
# Kubernetes pod spec with PGAdapter as a sidecar container
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      image: my-app:latest
      env:
        - name: DATABASE_URL
          value: "postgresql://localhost:5432/my-pg-database"
    - name: pgadapter
      image: gcr.io/cloud-spanner-pg-adapter/pgadapter:latest
      args:
        - "-p"
        - "my-gcp-project"
        - "-i"
        - "my-pg-instance"
        - "-d"
        - "my-pg-database"
      ports:
        - containerPort: 5432
```

This keeps the network hop between your app and PGAdapter local, and each pod gets its own adapter instance.

## Wrapping Up

The PostgreSQL interface for Cloud Spanner lowers the barrier to adoption significantly. Teams that already know PostgreSQL can use their familiar tools, drivers, and ORMs while getting Spanner's globally distributed, strongly consistent architecture. PGAdapter is the piece that makes it all work, translating the PostgreSQL wire protocol transparently. While not every PostgreSQL feature is supported, the coverage is broad enough for most application patterns. If you have been eyeing Spanner but did not want to rewrite your data layer, this is the path in.
